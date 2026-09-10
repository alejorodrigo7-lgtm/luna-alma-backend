// controllers/shiftController.js
const Shift = require('../models/Shift');
const Sale = require('../models/Sale');

// Abrir un nuevo turno
const openShift = async (req, res) => {
  try {
    // Verificar si ya hay un turno abierto
    const existingShift = await Shift.findOne({ 
      userId: req.userId, 
      status: 'open' 
    });
    
    if (existingShift) {
      return res.status(400).json({ 
        message: 'Ya tienes un turno abierto',
        shift: existingShift
      });
    }
    
    const { initialCash = 0 } = req.body;
    
    const shift = new Shift({
      userId: req.userId,
      initialCash,
      status: 'open',
      startTime: new Date()
    });
    
    await shift.save();
    
    res.status(201).json({
      success: true,
      message: 'Turno abierto exitosamente',
      shift
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cerrar turno
const closeShift = async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      userId: req.userId, 
      status: 'open' 
    });
    
    if (!shift) {
      return res.status(404).json({ message: 'No hay turno abierto' });
    }
    
    const { finalCash, notes } = req.body;
    
    shift.endTime = new Date();
    shift.status = 'closed';
    shift.finalCash = finalCash || shift.initialCash + shift.totalCash;
    shift.notes = notes;
    
    await shift.save();
    
    res.json({
      success: true,
      message: 'Turno cerrado exitosamente',
      shift
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener turno actual
const getCurrentShift = async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      userId: req.userId, 
      status: 'open' 
    }).populate('userId', 'name');
    
    if (!shift) {
      return res.json({ 
        success: false, 
        message: 'No hay turno activo',
        shift: null
      });
    }
    
    // Obtener ventas del turno
    const sales = await Sale.find({ shiftId: shift._id });
    
    res.json({
      success: true,
      shift,
      salesCount: sales.length,
      sales: sales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todos los turnos
const getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find()
      .sort({ startTime: -1 })
      .populate('userId', 'name');
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener turno por ID con sus ventas
const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id)
      .populate('userId', 'name');
    
    if (!shift) {
      return res.status(404).json({ message: 'Turno no encontrado' });
    }
    
    const sales = await Sale.find({ shiftId: shift._id });
    
    res.json({ shift, sales });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener cuadre de caja (resumen del turno)
const getShiftSummary = async (req, res) => {
  try {
    const shift = await Shift.findOne({ 
      userId: req.userId, 
      status: 'open' 
    });
    
    if (!shift) {
      return res.status(404).json({ message: 'No hay turno activo' });
    }
    
    const sales = await Sale.find({ shiftId: shift._id, status: 'completada' });
    
    const summary = {
      turno: {
        inicio: shift.startTime,
        cajero: shift.userId,
        estado: shift.status
      },
      ventas: {
        cantidad: sales.length,
        total: shift.totalSales,
        efectivo: shift.totalCash,
        tarjeta: shift.totalCard,
        transferencia: shift.totalTransfer
      },
      iva: shift.totalIva,
      cajaInicial: shift.initialCash,
      cajaEsperada: shift.initialCash + shift.totalCash
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  openShift,
  closeShift,
  getCurrentShift,
  getShifts,
  getShiftById,
  getShiftSummary
};