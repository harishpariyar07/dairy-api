const express = require('express');
const router = express.Router();

const { register, login, sendForgotPasswordMail, changePassword, renderForgotPasswordPage} = require('../controller/adminController');
const { getAllLedgerEntriesForRangeByAdmin } = require('../controller/ledgerController');
const { addRateList, getRate, deleteRateList, updateRateListById, getRateListById, getAllRateListByAdmin } = require('../controller/ratelistController');
const { deleteFarmer, addFarmerAsAdmin, getAllFarmers, updateFarmerById, getFarmerById, getLatestFarmerIdByAdmin } = require('../controller/farmerController');
const { settlePaymentByAdmin, getPaymentByAdmin, editPayment, deletePayment } = require('../controller/paymentController');
const { getAllDuesByAdmin, getPreviousDues } = require('../controller/duesController');
const { authAdmin } = require('../middleware/auth');
const { addCollection, getAllCollectionsForDate, getAverageFatByAdmin, getAverageSNFByAdmin, getTotalMilkByAdmin, updateCollection, getCollectionById, deleteCollection, getAllCollectionsForAdmin } = require('../controller/collectionController');
const { getBillDetails, addBillDetails, updateBillDetails } = require('../controller/billController');
const getReportByShift = require('../controller/reportController');

// AUTHENTICATION 
router.post('/signup', register);
router.post('/login', login)
router.post('/forgot-password', sendForgotPasswordMail)
router.post('/reset-password', changePassword)
router.get('/reset-password/:token', renderForgotPasswordPage)


// FARMERS ROUTING
router.post('/:username/farmer/', authAdmin, addFarmerAsAdmin)
router.delete('/:username/farmer/:farmerId', authAdmin, deleteFarmer)
router.put('/:username/farmer/:farmerId', authAdmin, updateFarmerById)
router.get('/:username/farmer/latestid', authAdmin, getLatestFarmerIdByAdmin)
router.get('/:username/farmer/:farmerId', authAdmin, getFarmerById)
router.get('/:username/farmer/', authAdmin, getAllFarmers)

// RATELIST ROUTING
router.post('/:username/ratelist', authAdmin, addRateList)
router.get('/:username/ratelist/:id', authAdmin, getRateListById)
router.get('/:username/ratelist/:farmerId/rate', authAdmin, getRate)
router.put('/:username/ratelist/:id', authAdmin, updateRateListById)
router.delete('/:username/ratelist/:id', authAdmin, deleteRateList)
router.get('/:username/ratelist', authAdmin, getAllRateListByAdmin)

// LEDGER ROUTING
router.get('/:username/ledger', authAdmin, getAllLedgerEntriesForRangeByAdmin)


// PAYMENT ROUTING
router.post('/:username/payment', authAdmin, settlePaymentByAdmin)
router.get('/:username/payment', authAdmin, getPaymentByAdmin)
router.put('/:username/payment/:id', authAdmin, editPayment)
router.delete('/:username/payment/:id', authAdmin, deletePayment)

// COLLECTION ROUTING
router.post('/:username/collection', authAdmin, addCollection)
router.get('/:username/collection', authAdmin, getAllCollectionsForDate)
router.put('/:username/collection/:id', authAdmin, updateCollection)
router.get('/:username/collection/:id', authAdmin, getCollectionById)
router.get('/collection/report', authAdmin, getAllCollectionsForAdmin)
router.delete('/:username/collection/:id', authAdmin, deleteCollection)
router.get('/collection/totalmilk', authAdmin, getTotalMilkByAdmin)
router.get('/collection/avgfat', authAdmin, getAverageFatByAdmin)
router.get('/collection/avgsnf', authAdmin, getAverageSNFByAdmin)

// DUES ROUTING
router.get('/:username/dues', authAdmin, getAllDuesByAdmin)
router.get('/:username/dues/:farmerId/prev', authAdmin, getPreviousDues)
// TODO : Update previous dues after the edit is done on a particular day

// BILL DETAILS
router.get('/bill', authAdmin, getBillDetails)
router.put('/bill', authAdmin, updateBillDetails)
router.post('/bill', authAdmin, addBillDetails)

// REPORT ROUTES
router.get('/:username/report', authAdmin, getReportByShift)

module.exports = router;
