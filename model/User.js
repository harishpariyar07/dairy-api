const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: [true, 'User ID missing'],
    },
    username: {
        type: String,
        required: [true, 'User name missing']
    },
    password: {
        type: String,
        required: [true, 'Password missing'],
        minLength: 8,
    },
    mobileNo: {
        type: Number,
    },
    contactPerson: {
        type: String,
    },
    address: {
        type: String,
    },
    permissions: {
        allowAddFarmer: { type: String, default: 'Not Allow', enum: ['Allow', 'Not Allow'] },
        allowLedger: { type: String, default: 'Not Allow', enum: ['Allow', 'Not Allow'] },
        allowPayment: { type: String, default: 'Not Allow', enum: ['Allow', 'Not Allow'] },
        allowRateChart: { type: String, default: 'Not Allow', enum: ['Allow', 'Not Allow'] },
        allowDues: { type: String, default: 'Not Allow', enum: ['Allow', 'Not Allow'] },
    },
    farmersCount: {
        type: Number,
        default: 0
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Admin ID missing'],
        ref: 'Admin'
    },
    timezone: {
        type: String,
        default: 'Asia/Kathmandu',
    },
    token: {
        type: String
    },
}, {
    timestamps: true
}
)

userSchema.index({ userId: 1, adminId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema)

module.exports = User