require('dotenv').config()
const express = require('express')
const dbConnect = require('./config/db')
const cors = require('cors')
const authUserRoute = require('./routes/authUserRoute')
const rateListRoute = require('./routes/rateListRoute')
const farmerRoute = require('./routes/farmerRoute')
const collectionRoute = require('./routes/collectionRoute')
const getDuesRoute = require('./routes/getDuesRoute')
const paymentRoute = require('./routes/paymentRoute')

dbConnect()

const server = express()
server.use(express.json())
server.use(cors())

server.use('/api/user', authUserRoute)
server.use('/api/ratelist', rateListRoute)
server.use('/api/farmer', farmerRoute)
server.use('/api/collection', collectionRoute)
server.use('/api/dues', getDuesRoute)
server.use('/api/payment', paymentRoute)

module.exports = server