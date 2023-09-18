const express = require('express');
const router = express.Router();

const { loginUser, registerUser, getAllUsers, getUser, getUserPermissions, updateUser } = require('../controller/userController');
const { addFarmerAsUser, getAllFarmers, getLatestFarmerIdByUser } = require('../controller/farmerController')
const { getRate, addRateListByUser, getAllRateListByUser } = require('../controller/ratelistController')

const { authAdmin, authUser, auth } = require('../middleware/auth');
const { settlePaymentByUser } = require('../controller/paymentController');
const { getAllLedgerEntriesForRange } = require('../controller/ledgerController');
const { getAllDuesByUser, getPreviousDues } = require('../controller/duesController');
const { getAllCollectionsForDate, getTotalMilkByUser, getAverageFatByUser, getAverageSNFByUser, updateCollection, getCollectionById, addCollection, deleteCollection, getAllCollectionsForUser } = require('../controller/collectionController');

// AUTHENTICATION 
router.post('/login', loginUser)
router.post('/signup', authAdmin, registerUser);
router.get('/', authAdmin, getAllUsers)
router.put('/:username', authAdmin, updateUser)
router.get('/:username', authAdmin, getUser)
router.get('/:username/permissions', authAdmin, getUserPermissions)

// FARMERS ROUTING
router.get('/:username/farmer/latestid/', authUser, getLatestFarmerIdByUser)
router.post('/:username/farmer/', authUser, addFarmerAsUser)
router.get('/:username/farmer/', authUser, getAllFarmers)

// RATELIST ROUTING
router.get('/:username/ratelist/:farmerId/rate', authUser, getRate)
router.get('/:username/ratelist', authUser, getAllRateListByUser)
router.post('/:username/ratelist', authUser, addRateListByUser)

// LEDGER ROUTING
router.get('/:username/ledger', authUser, getAllLedgerEntriesForRange)

// PAYMENT ROUTING
router.post('/:username/payment', authUser, settlePaymentByUser)

// COLLECTION ROUTING
router.get('/:username/collection/report', auth, getAllCollectionsForUser)
router.get('/:username/collection/totalmilk', auth, getTotalMilkByUser)
router.get('/:username/collection/avgfat', auth, getAverageFatByUser)
router.get('/:username/collection/avgsnf', auth, getAverageSNFByUser)
router.put('/:username/collection/:id', authAdmin, updateCollection)
// router.delete('/:username/collection/:id', authAdmin, deleteCollection)
router.get('/:username/collection/:id', authAdmin, getCollectionById)
router.post('/:username/collection', authUser, addCollection)
router.get('/:username/collection', authUser, getAllCollectionsForDate)

// DUES ROUTING
router.get('/:username/dues/:farmerId/prev', authUser, getPreviousDues)
router.get('/:username/dues', authUser, getAllDuesByUser)

module.exports = router;
