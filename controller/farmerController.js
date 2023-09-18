const Admin = require('../model/Admin');
const Farmer = require('../model/Farmer')
const User = require('../model/User')
const jwt = require('jsonwebtoken')

const addFarmerAsAdmin = async (req, res) => {
    try {
        const { farmerId, mobileNumber, farmerName, farmerLevel, paymentMode, bankName, accountNumber, bankHolderName, fixedRate } = req.body;

        if (!farmerId || !mobileNumber || !farmerName || !farmerLevel || !paymentMode) {
            return res.status(400).json({
                message: 'Missing required fields',
            });
        }

        const username = req.params.username;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                message: 'User does not exist',
            });
        }

        const token = req.headers.authorization.split(' ')[1];
        const admin_id = jwt.verify(token, process.env.SECRET_KEY).admin_id
        const admin = await Admin.findById(admin_id)
        const farmers = await Farmer.find({ userId: user._id })

        if (admin.maxFarmers === farmers.length) {
            return res.status(403).json({
                message: 'Maximum farmer limit reached',
            });
        }

        const existingFarmer = await Farmer.findOne({ farmerId, userId: user._id });

        if (existingFarmer) {
            return res.status(409).json({
                message: 'Farmer Already Exists',
            });
        }

        const farmer = await Farmer.create({ ...req.body, userId: user._id });

        user.farmersCount = user.farmersCount + 1
        await user.save()

        return res.status(201).json({
            message: 'Farmer added successfully',
            data: farmer,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: 'An error occurred while processing the request',
        });
    }
};

const addFarmerAsUser = async (req, res) => {
    try {
        const { farmerId, mobileNumber, farmerName, farmerLevel, paymentMode, bankName, accountNumber, bankHolderName, fixedRate } = req.body;

        if (!farmerId || !mobileNumber || !farmerName || !farmerLevel || !paymentMode) {
            return res.status(400).json({
                message: 'Missing required fields',
            });
        }

        const username = req.params.username;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                message: 'User does not exist',
            });
        }

        if (user.permissions.AddFarmer === 'Not Allow') {
            return res.status(403).json({
                message: 'User does not have permission to add farmer',
            });
        }

        const admin = await Admin.findById(user.adminId)
        const farmers = await Farmer.find({ userId: user._id })
        if (admin.maxFarmers === farmers.length) {
            return res.status(403).json({
                message: 'Maximum farmer limit reached',
            });
        }

        const existingFarmer = await Farmer.findOne({ farmerId, userId: user._id });

        if (existingFarmer) {
            return res.status(409).json({
                message: 'Farmer Already Exists',
            });
        }

        const farmer = await Farmer.create({ ...req.body, userId: user._id });
        user.farmersCount = user.farmersCount + 1
        await user.save()

        return res.status(201).json({
            message: 'Farmer added successfully',
            data: farmer,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: 'An error occurred while processing the request',
        });
    }
};

const getFarmerById = async (req, res) => {
    try {
        const { farmerId, username } = req.params
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({
                message: 'User does not exist'
            })
        }

        const farmer = await Farmer.findOne({ farmerId, userId: user._id })

        if (!farmer) {
            return res.status(404).json({
                message: 'No farmer found'
            })
        }

        return res.status(200).json(farmer)

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'An error occurred while processing the request'
        })
    }
}

const updateFarmerById = async (req, res) => {
    try {
        const { username } = req.params
        const { farmerId, mobileNumber, farmerName, farmerLevel, paymentMode, bankName, accountNumber, bankHolderName, fixedRate } = req.body;

        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        const farmer = await Farmer.findOne({ farmerId: req.params.farmerId, userId: user._id })

        if (!farmer) {
            return res.status(404).json({
                message: 'Farmer not found'
            })
        }

        farmer.farmerId = farmerId || farmer.farmerId
        farmer.mobileNumber = mobileNumber || farmer.mobileNumber
        farmer.farmerName = farmerName || farmer.farmerName
        farmer.farmerLevel = farmerLevel || farmer.farmerLevel
        farmer.paymentMode = paymentMode || farmer.paymentMode
        farmer.bankName = bankName || farmer.bankName
        farmer.accountNumber = accountNumber || farmer.accountNumber
        farmer.bankHolderName = bankHolderName || farmer.bankHolderName
        farmer.fixedRate = fixedRate || farmer.fixedRate

        await farmer.save()
        return res.status(200).json(farmer)

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'An error occurred while processing the request',
        })
    }
}

const deleteFarmer = async (req, res) => {
    try {
        const { username, farmerId } = req.params

        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({
                message: 'User does not exist',
            })
        }

        const farmer = await Farmer.findOneAndDelete({ farmerId, userId: user._id })

        return res.status(200).json({
            message: 'Farmer deleted successfully',
        })
    }
    catch (error) {
        console.log(error);

        res.status(500).json({
            message: 'An error occurred while processing the request',
        })
    }
}

const getAllFarmers = async (req, res) => {
    try {
        const username = req.params.username
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(400).json({
                status: 'User does not exist'
            })
        }

        const farmers = await Farmer.find({ userId: user._id })

        res.status(200).json(farmers)
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
}

const getLatestFarmerIdByAdmin = async (req, res) => {
    try {
        const username = req.params.username
        const user = await User.findOne({ username })
        if (!user) {
            return res.status(400).json({
                status: 'User does not exist'
            })
        }


        const recentFarmer = await Farmer.find({ userId: user._id }).sort({ farmerId: -1 }).limit(1)

        res.status(200).json(recentFarmer.length === 0 ? 0 : recentFarmer[0].farmerId)
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
}


const getLatestFarmerIdByUser = async (req, res) => {
    try {
        const username = req.params.username
        console.log(username)
        const user = await User.findOne({ username })
        if (!user) {
            return res.status(400).json({
                status: 'User does not exist'
            })
        }

        if (user.permissions.AddFarmer === 'Not Allow') {
            return res.status(403).json({
                message: 'User does not have permission to add farmer',
            });
        }

        const recentFarmer = await Farmer.find({ userId: user._id }).sort({ farmerId: -1 }).limit(1)

        res.status(200).json(recentFarmer.length === 0 ? 0 : recentFarmer[0].farmerId)
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
}


module.exports = { addFarmerAsAdmin, addFarmerAsUser, deleteFarmer, getAllFarmers, getFarmerById, updateFarmerById, getLatestFarmerIdByAdmin, getLatestFarmerIdByUser }