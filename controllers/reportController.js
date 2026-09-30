// controllers/reportController.js
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Shift = require('../models/Shift');
const InventoryMovement = require('../models/InventoryMovement');

// Helper: parsear rango de fechas
const parseRange = (from, to) => {
  const start = from ? new Date(from + 'T00:00:00.000Z') : new Date('2000-01-01T00:00:00.000Z');
  const end = to ? new Date(to + 'T23:59:59.999Z') : new Date('2100-01-01T00:00:00.000Z');
  return { start, end };
};

// Helper: redondear a 2 decimales
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ============================================================
// 1. REPORTE DE VENTAS (mejorado con filtro por método)
// GET /api/reports/sales?from=&to=&paymentMethod=all|Efectivo|Tarjeta|Transferencia
// ============================================================
const salesReport = async (req, res) => {
  try {
    const { from, to, paymentMethod = 'all' } = req.query;
    const { start, end } = parseRange(from, to);

    // Query base (sin filtro de método) para la comparativa global
    const baseQuery = {
      status: 'completada',
      createdAt: { $gte: start, $lte: end }
    };

    // Query filtrada (con método si aplica)
    const filteredQuery = { ...baseQuery };
    if (paymentMethod && paymentMethod !== 'all') {
      filteredQuery.paymentMethod = paymentMethod;
    }

    const [allSales, sales] = await Promise.all([
      Sale.find(baseQuery).lean(),
      Sale.find(filteredQuery)
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // ==== KPIs filtrados ====
    const total = round2(sales.reduce((acc, s) => acc + (s.total || 0), 0));
    const totalIva = round2(sales.reduce((acc, s) => acc + (s.iva || 0), 0));
    const totalBase = round2(sales.reduce((acc, s) => acc + (s.subtotal || 0), 0));
    const count = sales.length;
    const ticketPromedio = count > 0 ? round2(total / count) : 0;

    // ==== Comparativa GLOBAL (siempre con todas las ventas) ====
    const byMethod = {
      Efectivo: round2(allSales.filter(s => s.paymentMethod === 'Efectivo').reduce((a, s) => a + s.total, 0)),
      Tarjeta: round2(allSales.filter(s => s.paymentMethod === 'Tarjeta').reduce((a, s) => a + s.total, 0)),
      Transferencia: round2(allSales.filter(s => s.paymentMethod === 'Transferencia').reduce((a, s) => a + s.total, 0))
    };

    const countByMethod = {
      Efectivo: allSales.filter(s => s.paymentMethod === 'Efectivo').length,
      Tarjeta: allSales.filter(s => s.paymentMethod === 'Tarjeta').length,
      Transferencia: allSales.filter(s => s.paymentMethod === 'Transferencia').length
    };

    // ==== Top productos (según filtro) ====
    const productMap = {};
    sales.forEach(s => {
      s.products.forEach(item => {
        const key = String(item.productId);
        if (!productMap[key]) {
          productMap[key] = {
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            cantidad: 0,
            totalVendido: 0
          };
        }
        productMap[key].cantidad += item.quantity;
        productMap[key].totalVendido += item.subtotal || 0;
      });
    });

    const topProducts = Object.values(productMap)
      .map(r => ({ ...r, totalVendido: round2(r.totalVendido) }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    // ==== Top clientes (según filtro) ====
    const clientMap = {};
    sales.forEach(s => {
      const key = (s.clientEmail || s.clientName || 'anonimo').toLowerCase().trim();
      if (!clientMap[key]) {
        clientMap[key] = {
          clientName: s.clientName || 'Cliente general',
          clientEmail: s.clientEmail || '',
          compras: 0,
          total: 0,
          ultimaCompra: s.createdAt
        };
      }
      clientMap[key].compras += 1;
      clientMap[key].total += s.total || 0;
      if (new Date(s.createdAt) > new Date(clientMap[key].ultimaCompra)) {
        clientMap[key].ultimaCompra = s.createdAt;
      }
    });

    const topClients = Object.values(clientMap)
      .map(r => ({
        ...r,
        total: round2(r.total),
        ticketPromedio: round2(r.total / r.compras)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      success: true,
      range: { from: from || null, to: to || null },
      paymentMethod,
      summary: {
        total,
        totalIva,
        totalBase,
        count,
        ticketPromedio,
        byMethod,
        countByMethod
      },
      sales,
      topProducts,
      topClients
    });
  } catch (err) {
    console.error('Error salesReport:', err);
    res.status(500).json({ message: 'Error al generar el reporte de ventas', error: err.message });
  }
};

// ============================================================
// 2. REPORTE DE INVENTARIO (snapshot actual)
// GET /api/reports/inventory
// ============================================================
const inventoryReport = async (req, res) => {
  try {
    const products = await Product.find({ active: true }).lean();

    let totalCosto = 0;
    let totalVenta = 0;
    let totalUnidades = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const details = products.map(p => {
      const costo = (p.costPrice || 0) * (p.stock || 0);
      const venta = (p.salePrice || 0) * (p.stock || 0);
      totalCosto += costo;
      totalVenta += venta;
      totalUnidades += (p.stock || 0);
      if (p.stock === 0) outOfStock++;
      else if (p.stock <= p.minStock) lowStock++;

      return {
        _id: p._id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        stock: p.stock,
        minStock: p.minStock,
        valorCosto: round2(costo),
        valorVenta: round2(venta),
        gananciaPotencial: round2(venta - costo),
        margen: p.margin
      };
    });

    res.json({
      success: true,
      summary: {
        totalProductos: products.length,
        totalUnidades,
        totalCosto: round2(totalCosto),
        totalVenta: round2(totalVenta),
        gananciaPotencial: round2(totalVenta - totalCosto),
        lowStock,
        outOfStock
      },
      products: details
    });
  } catch (err) {
    console.error('Error inventoryReport:', err);
    res.status(500).json({ message: 'Error al generar el reporte de inventario', error: err.message });
  }
};

// ============================================================
// 3. REPORTE DE CAJA (turnos en un rango)
// GET /api/reports/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================================
const shiftsReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = parseRange(from, to);

    const shifts = await Shift.find({
      startTime: { $gte: start, $lte: end }
    })
      .populate('userId', 'name')
      .sort({ startTime: -1 })
      .lean();

    const totalVentas = round2(shifts.reduce((a, s) => a + (s.totalSales || 0), 0));
    const totalIva = round2(shifts.reduce((a, s) => a + (s.totalIva || 0), 0));
    const totalTransacciones = shifts.reduce((a, s) => a + (s.saleCount || 0), 0);

    res.json({
      success: true,
      range: { from: from || null, to: to || null },
      summary: {
        totalTurnos: shifts.length,
        totalVentas,
        totalIva,
        totalTransacciones
      },
      shifts
    });
  } catch (err) {
    console.error('Error shiftsReport:', err);
    res.status(500).json({ message: 'Error al generar el reporte de caja', error: err.message });
  }
};

// ============================================================
// 4. REPORTE DE UTILIDADES (ventas - costo de productos vendidos)
// GET /api/reports/profit?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================================
const profitReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = parseRange(from, to);

    const sales = await Sale.find({
      status: 'completada',
      createdAt: { $gte: start, $lte: end }
    }).lean();

    // Recolectar todos los productIds vendidos
    const productIds = new Set();
    sales.forEach(s => s.products.forEach(p => productIds.add(String(p.productId))));

    // Traer costos actuales (aproximación — el ideal sería guardar el costo al momento de la venta)
    const products = await Product.find({ _id: { $in: [...productIds] } }).lean();
    const costMap = {};
    products.forEach(p => { costMap[String(p._id)] = p.costPrice || 0; });

    let totalVenta = 0;
    let totalCosto = 0;
    let totalBase = 0;
    let totalIva = 0;

    const items = [];
    sales.forEach(s => {
      s.products.forEach(item => {
        const costo = (costMap[String(item.productId)] || 0) * item.quantity;
        const venta = item.subtotal || 0;
        const ganancia = venta - costo;
        totalVenta += venta;
        totalCosto += costo;

        items.push({
          invoice: s.invoice,
          date: s.createdAt,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          costoUnitario: costMap[String(item.productId)] || 0,
          costoTotal: round2(costo),
          ganancia: round2(ganancia),
          margen: venta > 0 ? round2((ganancia / venta) * 100) : 0
        });
      });
      totalBase += s.subtotal || 0;
      totalIva += s.iva || 0;
    });

    res.json({
      success: true,
      range: { from: from || null, to: to || null },
      summary: {
        totalVenta: round2(totalVenta),
        totalCosto: round2(totalCosto),
        gananciaBruta: round2(totalVenta - totalCosto),
        margenGlobal: totalVenta > 0 ? round2(((totalVenta - totalCosto) / totalVenta) * 100) : 0,
        totalBase: round2(totalBase),
        totalIva: round2(totalIva)
      },
      items
    });
  } catch (err) {
    console.error('Error profitReport:', err);
    res.status(500).json({ message: 'Error al generar el reporte de utilidades', error: err.message });
  }
};

// ============================================================
// 5. REPORTE POR CATEGORÍAS
// GET /api/reports/categories?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================================
const categoriesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = parseRange(from, to);

    const sales = await Sale.find({
      status: 'completada',
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const productIds = new Set();
    sales.forEach(s => s.products.forEach(p => productIds.add(String(p.productId))));
    const products = await Product.find({ _id: { $in: [...productIds] } }).lean();
    const catMap = {};
    products.forEach(p => { catMap[String(p._id)] = p.category || 'Otros'; });

    const data = {};
    sales.forEach(s => {
      s.products.forEach(item => {
        const cat = catMap[String(item.productId)] || 'Otros';
        if (!data[cat]) data[cat] = { categoria: cat, cantidad: 0, total: 0 };
        data[cat].cantidad += item.quantity;
        data[cat].total += item.subtotal || 0;
      });
    });

    const rows = Object.values(data).map(r => ({
      ...r,
      total: round2(r.total)
    })).sort((a, b) => b.total - a.total);

    const granTotal = round2(rows.reduce((a, r) => a + r.total, 0));

    res.json({
      success: true,
      range: { from: from || null, to: to || null },
      summary: { granTotal, categorias: rows.length },
      categories: rows
    });
  } catch (err) {
    console.error('Error categoriesReport:', err);
    res.status(500).json({ message: 'Error al generar el reporte por categorías', error: err.message });
  }
};

// ============================================================
// 6. TOP PRODUCTOS
// GET /api/reports/top-products?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
// ============================================================
const topProductsReport = async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    const { start, end } = parseRange(from, to);

    const sales = await Sale.find({
      status: 'completada',
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const data = {};
    sales.forEach(s => {
      s.products.forEach(item => {
        const key = String(item.productId);
        if (!data[key]) {
          data[key] = {
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            cantidad: 0,
            totalVendido: 0
          };
        }
        data[key].cantidad += item.quantity;
        data[key].totalVendido += item.subtotal || 0;
      });
    });

    const rows = Object.values(data)
      .map(r => ({ ...r, totalVendido: round2(r.totalVendido) }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      range: { from: from || null, to: to || null },
      limit: parseInt(limit, 10),
      products: rows
    });
  } catch (err) {
    console.error('Error topProductsReport:', err);
    res.status(500).json({ message: 'Error al generar el top de productos', error: err.message });
  }
};

// ============================================================
// 7. TOP CLIENTES
// GET /api/reports/top-clients?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
// ============================================================
const topClientsReport = async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    const { start, end } = parseRange(from, to);

    const sales = await Sale.find({
      status: 'completada',
      createdAt: { $gte: start, $lte: end }
    }).lean();

    const data = {};
    sales.forEach(s => {
      const key = (s.clientEmail || s.clientName || 'anonimo').toLowerCase().trim();
      if (!data[key]) {
        data[key] = {
          clientName: s.clientName || 'Cliente general',
          clientEmail: s.clientEmail || '',
          compras: 0,
          total: 0,
          ultimaCompra: s.createdAt
        };
      }
      data[key].compras += 1;
      data[key].total += s.total || 0;
      if (new Date(s.createdAt) > new Date(data[key].ultimaCompra)) {
        data[key].ultimaCompra = s.createdAt;
      }
    });

    const rows = Object.values(data)
      .map(r => ({
        ...r,
        total: round2(r.total),
        ticketPromedio: round2(r.total / r.compras)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      range: { from: from || null, to: to || null },
      limit: parseInt(limit, 10),
      clients: rows
    });
  } catch (err) {
    console.error('Error topClientsReport:', err);
    res.status(500).json({ message: 'Error al generar el top de clientes', error: err.message });
  }
};

module.exports = {
  salesReport,
  inventoryReport,
  shiftsReport,
  profitReport,
  categoriesReport,
  topProductsReport,
  topClientsReport
};
