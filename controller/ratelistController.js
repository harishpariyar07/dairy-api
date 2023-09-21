const Collection = require("../model/Collection");
const Farmer = require("../model/Farmer");
const RateList = require("../model/RateList");
const User = require("../model/User");

const addRateList = async (req, res) => {
    try {
        const {
            category,
            level,
            rateChartName,
            stdFatRate,
            stdSNFRate,
            stdTSRate,
            incentive,
        } = req.body;

        if (!category) {
            return res.status(400).json({
                error: "Mandatory fields are missing",
            });
        }

        const username = req.params.username;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const existingRateList = await RateList.findOne({ rateChartName });

        if (existingRateList) {
            return res.status(400).json({
                error: "Rate List Already Exists",
            });
        }

        switch (category) {
            case "KGFAT + KGSNF":
                if (
                    !level ||
                    !rateChartName ||
                    !stdFatRate ||
                    !stdSNFRate ||
                    !stdTSRate ||
                    !incentive
                ) {
                    return res.status(400).json({
                        error: "Mandatory fields are missing",
                    });
                }
                break;
            case "KG FAT ONLY":
                if (!level || !rateChartName || !stdFatRate || !incentive) {
                    return res.status(400).json({
                        error: "Mandatory fields are missing",
                    });
                }
                break;
            default:
                res.status(400).json({
                    error: "Invalid Category",
                });
        }

        const rateList = await RateList.create({ ...req.body, userId: user._id });

        res.status(201).json(rateList);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "An error occurred while processing the request",
        });
    }
};

const addRateListByUser = async (req, res) => {
    try {
        const {
            category,
            level,
            rateChartName,
            stdFatRate,
            stdSNFRate,
            stdTSRate,
            incentive,
        } = req.body;

        if (!category) {
            return res.status(400).json({
                error: "Mandatory fields are missing",
            });
        }

        const username = req.params.username;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        // Check if the user has permission to add rate lists
        if (user.permissions === "Not Allow") {
            return res.status(403).json({
                error: "Permission denied. User is not allowed to add rate lists.",
            });
        }

        const existingRateList = await RateList.findOne({ rateChartName });

        if (existingRateList) {
            return res.status(400).json({
                error: "Rate List Already Exists",
            });
        }

        switch (category) {
            case "KGFAT + KGSNF":
                if (
                    !level ||
                    !rateChartName ||
                    !stdFatRate ||
                    !stdSNFRate ||
                    !stdTSRate ||
                    !incentive
                ) {
                    return res.status(400).json({
                        error: "Mandatory fields are missing",
                    });
                }
                break;
            case "KG FAT ONLY":
                if (!level || !rateChartName || !stdFatRate || !incentive) {
                    return res.status(400).json({
                        error: "Mandatory fields are missing",
                    });
                }
                break;
            default:
                res.status(400).json({
                    error: "Invalid Category",
                });
        }

        const rateList = await RateList.create({ ...req.body, userId: user._id });

        res.status(201).json(rateList);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "An error occurred while processing the request",
        });
    }
};


const getAllRateListByAdmin = async (req, res) => {
    try {
        const username = req.params.username;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const rateLists = await RateList.find({ userId: user._id });
        res.status(200).json(rateLists);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "An error occurred while processing the request",
        });
    }
};

const getAllRateListByUser = async (req, res) => {
    try {
        const username = req.params.username;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        if (user.permissions === "Not Allow") {
            return res.status(403).json({
                error: "Permission denied. User is not allowed to view rate lists.",
            });
        }

        const rateLists = await RateList.find({ userId: user._id });
        res.status(200).json(rateLists);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "An error occurred while processing the request",
        });
    }
};

const getRateListById = async (req, res) => {
    try {
        const { id } = req.params
        const rateList = await RateList.findById(id)

        if (!rateList) {
            return res.status(404).json({
                message: 'Rate chart not found'
            })
        }

        return res.status(200).json(rateList)
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({
            error: "An error occurred while processing the request",
        })
    }
}

const updateRateListById = async (req, res) => {
    try {
        const { id } = req.params
        const rateList = await RateList.findById(id)
        const {
            category,
            level,
            rateChartName,
            stdFatRate,
            stdSNFRate,
            stdTSRate,
            incentive,
        } = req.body;


        if (!rateList) {
            return res.status(404).json({
                message: 'Rate chart not found'
            })
        }


        rateList.category = category || rateList.category
        rateList.level = level || rateList.level
        rateList.rateChartName = rateChartName || rateList.rateChartName
        rateList.stdFatRate = stdFatRate || rateList.stdFatRate
        rateList.stdSNFRate = stdSNFRate || rateList.stdSNFRate
        rateList.stdTSRate = stdTSRate || rateList.stdTSRate
        rateList.incentive = incentive || rateList.incentive

        await rateList.save()

        return res.status(200).json(rateList)
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: "An error occurred while processing the request",
        });
    }
}

const deleteRateList = async (req, res) => {
    try {
        const rateListId = req.params.id;
        const username = req.params.username;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const rateList = await RateList.findById(rateListId);

        if (!rateList) {
            return res.status(404).json({
                error: "Rate List not found",
            });
        }

        // Check if the rate list belongs to the user before deletion
        if (rateList.userId.toString() !== user._id.toString()) {
            return res.status(403).json({
                error: "Permission denied. You are not the owner of this rate list.",
            });
        }

        await RateList.findByIdAndDelete(rateListId);

        res.status(200).json({
            message: "Rate List deleted successfully",
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "An error occurred while processing the request",
        });
    }
};



const getRate = async (req, res) => {
    try {
        const { fat, snf, shift } = req.query;
        const { farmerId } = req.params;
        const username = req.params.username;
        const user = await User.findOne({ username });
        const parsedFat = parseFloat(fat)
        const parsedSnf = parseFloat(snf)

        if (!user) {
            return res.status(404).json({
                status: "User not found",
            });
        }

        const farmer = await Farmer.findOne({ userId: user._id, farmerId });

        if (!farmer) {
            return res.status(400).json({
                status: "Invalid Farmer ID or The Farmer does not belong to the User",
            });
        }

        let rate = 0;

        if (farmer.farmerLevel === 5) {
            rate = farmer.fixedRate;
        } else if (parsedFat !== 0 && parsedSnf !== 0) {
            const rateChart = await RateList.findOne({
                level: farmer.farmerLevel,
                userId: user._id,
            });

            const { incentive, stdFatRate, stdSNFRate, stdTSRate } = rateChart;

            switch (rateChart.category) {
                case "KGFAT + KGSNF":
                    rate =
                        (stdFatRate * parsedFat) +
                        (stdSNFRate * parsedSnf) +
                        (parsedFat + parsedSnf) * stdTSRate +
                        incentive;
                    break;

                case "KG FAT ONLY":
                    rate = (stdFatRate * parsedFat) + incentive;
                    break;

                default:
                    return res.status(400).json({
                        error: "Invalid Category",
                    });
            }
        } else {
            rate = await Collection.findOne({ userId: user._id, farmerId, shift }).sort({collectionDate: -1 , createdAt: -1}).limit(1).then((collection) => collection.rate).catch((err) => {
                console.log(err)
            });
        }

        return res.json({ rate: rate.toFixed(2) });
    } catch (error) {
        return res.status(400).json({
            status: "No rate chart found for this farmer",
        });
    }
};

module.exports = { addRateList, addRateListByUser, getAllRateListByAdmin, getAllRateListByUser, getRateListById, updateRateListById, deleteRateList, getRate };
