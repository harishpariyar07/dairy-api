const { compareDate } = require('../helpers/compareDate');
const Collection = require('../model/Collection')
const Farmer = require('../model/Farmer');
const Ledger = require('../model/Ledger');
const Report = require('../model/Report');
const User = require('../model/User')
const jwt = require('jsonwebtoken')

const addCollection = async (req, res) => {
    try {
        const { username } = req.params;
        const { farmerId, collectionDate, qty, fat, snf, rate, amount, shift } = req.body;
        const formattedDate = new Date(collectionDate);
        let {isChanged} = req.query
        let previousBalance

        if (!username || !farmerId || !collectionDate || !qty || qty === 0 || !rate || rate === 0 || !amount || amount === 0) {
            return res.status(400).json({
                message: 'Please provide all the details',
            });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).send({ message: 'No user found' });
        }

        const farmer = await Farmer.findOne({ userId: user._id, farmerId });

        if (!farmer) {
            return res.status(400).json({
                status: 'Invalid Farmer ID or The Farmer does not belong to the User',
            });
        }

       if (isChanged && isChanged === "true")
        {
            let searchCriteria;
            
            let nextCollection

            if (shift === 'Morning') {
                // If the current collection is in the "Morning" shift, search for the "Evening" shift on or after the same date.
                searchCriteria = {
                    $or: [
                        {
                            $expr: {
                                $and: [
                                    { $eq: [{ $dayOfMonth: '$collectionDate' }, { $dayOfMonth: formattedDate }] },
                                    { $eq: [{ $month: '$collectionDate' }, { $month: formattedDate }] },
                                    { $eq: [{ $year: '$collectionDate' }, { $year: formattedDate }] }
                                ]
                            },
                            shift: 'Evening'
                        },
                        {
                            collectionDate: { $gt: collectionDate }
                        }
                    ]
                };
            } else if (shift === 'Evening') {
                // If the current collection is in the "Evening" shift, search for any "Morning" shift on or after the same date.
                searchCriteria = {
                    collectionDate: { $gt: collectionDate },
                };
            }


            const findCollectionAndUpdateLedger = async () => {
                try {
                    nextCollection = await Collection.findOne(searchCriteria)
                        .sort({ collectionDate: 1, shift: 1 }); // Sort by date and shift in ascending order

                    const ledger = await Ledger.findOne({collectionId: nextCollection._id})
                    // for the new data 
                    previousBalance = ledger.previousBalance 
            
                    // updation of upcoming ledgers
                    let updateCriteria
                    if (shift === 'Morning') {
                        // If the current collection is in the "Morning" shift, search for the "Evening" shift on or after the same date.
                        updateCriteria = {
                            userId: user._id,
                            $or: [
                                {
                                    $expr: {
                                        $and: [
                                            { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: formattedDate }] },
                                            { $eq: [{ $month: '$date' }, { $month: formattedDate }] },
                                            { $eq: [{ $year: '$date' }, { $year: formattedDate }] }
                                        ]
                                    },
                                    shift: 'Evening'
                                },
                                {
                                    date: { $gt: collectionDate }
                                }
                            ]
                        };
                    } else if (shift === 'Evening') {
                        // If the current collection is in the "Evening" shift, search for any "Morning" shift on or after the same date.
                        updateCriteria = {
                            userId: user._id,
                            date: { $gt: collectionDate },
                        };
                    }

                    // Update all the matching ledger documents
                    const update = {
                        $inc: { previousBalance: amount } // Increment previousBalance by the amount
                    };

                    const ledgers = await Ledger.updateMany(updateCriteria, update)

                    console.log(ledgers)

                } catch (err) {
                    console.error('Error:', err);
                }
            };
            
            findCollectionAndUpdateLedger();
        }
        else
        {
            previousBalance = Number(farmer.credit) - Number(farmer.debit);
        } 


        const collection = await Collection.create({
            farmerId,
            farmerName: farmer.farmerName,
            qty,
            fat,
            snf,
            rate,
            amount,
            userId: user._id,
            collectionDate,
            shift
        });

        // let previousBalance = Number(farmer.credit) - Number(farmer.debit);

        await Ledger.create({
            farmerId,
            farmerName: farmer.farmerName,
            date: collectionDate,
            credit: amount,
            remarks: 'Collection',
            userId: user._id,
            qty,
            shift,
            fat,
            snf,
            amount,
            previousBalance: previousBalance,
            collectionId: collection._id
        })

        farmer.credit = (farmer.credit + Number(amount)).toFixed(2);
        await farmer.save();

        // add to report
        const report = await Report.findOne({
            username: user.username,
            shift: shift,
            $expr: {
              $and: [
                { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: formattedDate }] },
                { $eq: [{ $month: '$date' }, { $month: formattedDate }] },
                { $eq: [{ $year: '$date' }, { $year: formattedDate }] }
              ]
            }
          });
          

        if (!report) {
            let tempMilk = 0, tempFat = 0, tempSNF = 0;
            if (fat !== 0 && snf !== 0) {
                tempMilk = qty;
                tempFat = Number(fat * qty).toFixed(2);
                tempSNF = Number(snf * qty).toFixed(2);
            }
            await Report.create({
                userId: user.userId,
                username: username,
                contactPerson: user.contactPerson,
                date: collectionDate,
                shift: shift,
                totalMilk: qty,
                avgFat: fat,
                avgSNF: snf,
                totalAmount: amount,
                tempMilk: tempMilk,
                tempFat: tempFat,
                tempSNF: tempSNF,
                adminId: user.adminId
            });
        } else {
            let tempMilk = 0, tempFat = 0, tempSNF = 0;
            report.totalMilk = (report.totalMilk + Number(qty)).toFixed(2);
            report.totalAmount = (report.totalAmount + Number(amount)).toFixed(2);
            if (fat !== 0 && snf !== 0) {
                tempMilk = Number(report.tempMilk + Number(qty)).toFixed(2);
                tempFat = Number(report.tempFat + Number(fat * qty)).toFixed(2);
                tempSNF = Number(report.tempSNF + Number(snf * qty)).toFixed(2);

                report.avgFat = (tempFat / tempMilk).toFixed(2);
                report.avgSNF = (tempSNF / tempMilk).toFixed(2);
                report.tempFat = tempFat;
                report.tempSNF = tempSNF;
                report.tempMilk = tempMilk;
            }
            await report.save();
        }

        return res.status(201).json('Collection added successfully');
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};

const getCollectionById = async (req, res) => {
    try {
        const { id } = req.params;

        const collection = await Collection.findById(id);

        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        return res.status(200).json(collection);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
}

const updateCollection = async (req, res) => {
    try {
        const { id, username } = req.params;
        const { farmerId, collectionDate, qty, fat, snf, rate, amount, shift } = req.body;
        const formattedDate = new Date(collectionDate)

        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).send({ message: 'No user found' });
        }

        const farmer = await Farmer.findOne({ userId: user._id, farmerId });

        if (!farmer) {
            return res.status(400).json({
                status: 'Invalid Farmer ID or The Farmer does not belong to the User',
            });
        }

        const collection = await Collection.findById(id);

        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        if (amount) {
            farmer.credit = farmer.credit - Number(collection.amount) + Number(amount);
        }

        // update previous balances

        const findCollectionAndUpdateLedger = async () => {
            try {
        
                // updation of upcoming ledgers
                let updateCriteria
                if (shift === 'Morning') {
                    // If the current collection is in the "Morning" shift, search for the "Evening" shift on or after the same date.
                    updateCriteria = {
                        userId: user._id,
                        $or: [
                            {
                                $expr: {
                                    $and: [
                                        { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: formattedDate }] },
                                        { $eq: [{ $month: '$date' }, { $month: formattedDate }] },
                                        { $eq: [{ $year: '$date' }, { $year: formattedDate }] }
                                    ]
                                },
                                shift: 'Evening'
                            },
                            {
                                date: { $gt: collectionDate }
                            }
                        ]
                    };
                } else if (shift === 'Evening') {
                    // If the current collection is in the "Evening" shift, search for any "Morning" shift on or after the same date.
                    updateCriteria = {
                        userId: user._id,
                        date: { $gt: collectionDate },
                    };
                }

                // Update all the matching ledger documents
                const update = {
                    $inc: { previousBalance: amount - collection.amount } // Increment previousBalance by the amount
                };

                const ledgers = await Ledger.updateMany(updateCriteria, update)

                console.log(ledgers)

            } catch (err) {
                console.error('Error:', err);
            }
        };
        
        findCollectionAndUpdateLedger();

        
        if (collection.shift !== shift || compareDate(collection.collectionDate, collectionDate) === false) {
            // new report
            let report1 = await Report.findOne({
                username: user.username,
                shift: shift,
                $expr: {
                    $and: [
                      { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: new Date(collectionDate) }] },
                      { $eq: [{ $month: '$date' }, { $month: new Date(collectionDate) }] },
                      { $eq: [{ $year: '$date' }, { $year: new Date(collectionDate) }] }
                    ]
                  }            
                });
            
            // original report
            let report2 = await Report.findOne({
                username: user.username,
                shift: collection.shift,
                $expr: {
                    $and: [
                      { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: new Date(collection.collectionDate) }] },
                      { $eq: [{ $month: '$date' }, { $month: new Date(collection.collectionDate) }] },
                      { $eq: [{ $year: '$date' }, { $year: new Date(collection.collectionDate) }] }
                    ]
                  }   
                });

            if (!report2) {
                return res.status(404).json({ message: 'Original report not found' });
            }
            
            // if no collection is done on the updated day and shift
            // generate new report
            if (!report1) {
                let tempMilk = 0, tempFat = 0, tempSNF = 0;
                if (fat !== 0 && snf !== 0) {
                    tempMilk = qty;
                    tempFat = Number(fat * qty).toFixed(2);
                    tempSNF = Number(snf * qty).toFixed(2);
                }

                report1 = new Report({
                    userId: user.userId,
                    username: username,
                    contactPerson: user.contactPerson,
                    date: collectionDate,
                    shift: shift,
                    totalMilk: qty,
                    avgFat: Number(fat),
                    avgSNF: Number(snf),
                    totalAmount: amount,
                    tempMilk: tempMilk,
                    tempFat: tempFat,
                    tempSNF: tempSNF,
                    adminId: user.adminId
                });
            }
            // else update the report
            else
            {
                report1.totalMilk = (report1.totalMilk + Number(qty)).toFixed(2);
                report1.totalAmount = (report1.totalAmount + Number(amount)).toFixed(2);
                if (fat !== 0 && snf !== 0) {
                    report1.tempMilk = (report1.tempMilk + Number(qty)).toFixed(2);
                    report1.tempFat = (report1.tempFat + Number(fat * qty)).toFixed(2);
                    report1.tempSNF = (report1.tempSNF + Number(snf * qty)).toFixed(2);
                    
                    report1.avgFat = (report1.tempFat / report1.tempMilk).toFixed(2);
                    report1.avgSNF = (report1.tempSNF / report1.tempMilk).toFixed(2);
                }
            }

            // update the original report
            report2.totalMilk = (report2.totalMilk - Number(collection.qty)).toFixed(2);
            report2.totalAmount = (report2.totalAmount - Number(collection.amount)).toFixed(2);
            if (collection.fat !== 0 && collection.snf !== 0) {
                report2.tempMilk = (report2.tempMilk - Number(collection.qty)).toFixed(2);
                report2.tempFat = (report2.tempFat - Number(collection.fat * collection.qty)).toFixed(2);
                report2.tempSNF = (report2.tempSNF - Number(collection.snf * collection.qty)).toFixed(2);
                
                report2.avgFat = report2.tempMilk > 0 ? (report2.tempFat / report2.tempMilk).toFixed(2) : 0;
                report2.avgSNF = report2.tempMilk > 0 ? (report2.tempSNF / report2.tempMilk).toFixed(2) : 0;
            }

            await report1.save();
            await report2.save();
        }
        else
        {
            const report = await Report.findOne({
                username: user.username,
                shift: shift,
                $expr: {
                    $and: [
                      { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: new Date(collection.collectionDate) }] },
                      { $eq: [{ $month: '$date' }, { $month: new Date(collection.collectionDate) }] },
                      { $eq: [{ $year: '$date' }, { $year: new Date(collection.collectionDate) }] }
                    ]
                  }   
            });

            if (!report) {
                return res.status(404).json({ message: 'Report not found' });
            }
    
            report.totalMilk = (report.totalMilk - Number(collection.qty) + Number(qty)).toFixed(2);
            report.totalAmount = (report.totalAmount - Number(collection.amount) + Number(amount)).toFixed(2);
            if (collection.fat !== 0 && collection.snf !== 0) {
                report.tempMilk = (report.tempMilk - Number(collection.qty) + Number(qty)).toFixed(2);
                report.tempFat = (report.tempFat - Number(collection.fat * collection.qty) + Number(fat * qty)).toFixed(2);
                report.tempSNF = (report.tempSNF - Number(collection.snf * collection.qty) + Number(snf * qty)).toFixed(2);
    
                report.avgFat = (report.tempFat / report.tempMilk).toFixed(2);
                report.avgSNF = (report.tempSNF / report.tempMilk).toFixed(2);
            }
    
            await report.save();
        }

        collection.amount = amount || collection.amount;
        collection.collectionDate = collectionDate || collection.collectionDate;
        collection.fat = fat || collection.fat;
        collection.qty = qty || collection.qty;
        collection.rate = rate || collection.rate;
        collection.snf = snf || collection.snf;
        collection.shift = shift || collection.shift;

        const ledger = await Ledger.findOne({ collectionId: id });

        if (!ledger) {
            return res.status(404).json({ message: 'Ledger not found' });
        }

        ledger.credit = amount || ledger.credit;
        ledger.date = collectionDate || ledger.date;
        ledger.fat = fat || ledger.fat;
        ledger.qty = qty || ledger.qty;
        ledger.snf = snf || ledger.snf;
        ledger.shift = shift || ledger.shift
        
        

        await collection.save();
        await ledger.save();
        await farmer.save();

        return res.status(200).json('Collection updated successfully');
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
}

const deleteCollection = async (req, res) => {
    try {
        const { id, username} = req.params;
        const { date, shift } = req.query;
        const formattedDate = new Date(date);

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).send({ message: 'No user found' });
        }

        const collection = await Collection.findById(id);

        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        // update previous balances

        const findCollectionAndUpdateLedger = async () => {
            try {
        
                // updation of upcoming ledgers
                let updateCriteria
                if (shift === 'Morning') {
                    // If the current collection is in the "Morning" shift, search for the "Evening" shift on or after the same date.
                    updateCriteria = {
                        userId: user._id,
                        $or: [
                            {
                                $expr: {
                                    $and: [
                                        { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: formattedDate }] },
                                        { $eq: [{ $month: '$date' }, { $month: formattedDate }] },
                                        { $eq: [{ $year: '$date' }, { $year: formattedDate }] }
                                    ]
                                },
                                shift: 'Evening'
                            },
                            {
                                date: { $gt: date }
                            }
                        ]
                    };
                } else if (shift === 'Evening') {
                    // If the current collection is in the "Evening" shift, search for any "Morning" shift on or after the same date.
                    updateCriteria = {
                        userId: user._id,
                        date: { $gt: date },
                    };
                }

                // Update all the matching ledger documents
                const update = {
                    $inc: { previousBalance: -collection.amount } // Increment previousBalance by the amount
                };

                const ledgers = await Ledger.updateMany(updateCriteria, update)

                console.log(ledgers)

            } catch (err) {
                console.error('Error:', err);
            }
        };
        
        findCollectionAndUpdateLedger();

        await Collection.findByIdAndDelete(id);

        const ledger = await Ledger.findOne({ collectionId: id });
        if (ledger) {
            await Ledger.findByIdAndDelete(ledger._id);
        }

        const farmer = await Farmer.findOne({ userId: user._id, farmerId: collection.farmerId });


        if (!farmer) {
            return res.status(400).json({
                message: 'Invalid Farmer ID or The Farmer does not belong to the User',
            });
        }

        const report = await Report.findOne({
            username,
            shift, 
            $expr: {
                $and: [
                  { $eq: [{ $dayOfMonth: '$date' }, { $dayOfMonth: formattedDate }] },
                  { $eq: [{ $month: '$date' }, { $month: formattedDate }] },
                  { $eq: [{ $year: '$date' }, { $year: formattedDate }] }
                ]
              }
        })

        if (report)
        {
            report.totalMilk = (report.totalMilk - Number(collection.qty)).toFixed(2);
            report.totalAmount = (report.totalAmount - Number(collection.amount)).toFixed(2);
            if (collection.fat !== 0 && collection.snf !== 0) {
                report.tempMilk = (report.tempMilk - Number(collection.qty)).toFixed(2);
                report.tempFat = (report.tempFat - Number(collection.fat * collection.qty)).toFixed(2);
                report.tempSNF = (report.tempSNF - Number(collection.snf * collection.qty)).toFixed(2);

                report.avgFat = report.tempMilk > 0 ? (report.tempFat / report.tempMilk).toFixed(2) : 0;
                report.avgSNF = report.tempMilk > 0 ? (report.tempSNF / report.tempMilk).toFixed(2) : 0;
            }

            await report.save();
        }

        farmer.credit = (farmer.credit - Number(collection.amount)).toFixed(2);
        await farmer.save();

        return res.status(200).json('Collection deleted successfully');
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};



const getAllCollectionsForDate = async (req, res) => {
    try {
        const { username } = req.params;
        const { date, shift } = req.query;
        const formattedDate = new Date(date);

        if (isNaN(formattedDate)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        const collections = await Collection.find({
            $and: [
                { userId: user._id },
                {
                    $expr: {
                        $and: [
                            { $eq: [{ $dayOfMonth: '$collectionDate' }, { $dayOfMonth: formattedDate }] },
                            { $eq: [{ $month: '$collectionDate' }, { $month: formattedDate }] },
                            { $eq: [{ $year: '$collectionDate' }, { $year: formattedDate }] },
                            { $eq: ['$shift', shift] }, // Match the shift value
                        ]
                    }
                }
            ]
        }).sort({ collectionDate: -1 , createdAt: -1});
        res.status(200).json(collections);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};

const getTotalMilkByAdmin = async (req, res) => {
    const { start, end } = req.query;

    try {
        const token = req.headers.authorization.split(' ')[1];
        const admin_id = jwt.decode(token).admin_id;

        let totalMilk;

        const users = await User.find({ adminId: admin_id });
        const userIds = users.map((user) => user._id);

        totalMilk = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: { $in: userIds }, // Filter collections by userIds array
                },
            },
            {
                $group: {
                    _id: null,
                    totalMilk: {
                        $sum: '$qty',
                    },
                },
            },
        ]);
        res.status(200).json(totalMilk);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};

const getTotalMilkByUser = async (req, res) => {
    const { start, end } = req.query;

    try {
        const { username } = req.params

        let totalMilk;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        totalMilk = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: user._id, // Filter collections by userIds array
                },
            },
            {
                $group: {
                    _id: null,
                    totalMilk: {
                        $sum: '$qty',
                    },
                },
            },
        ]);
        res.status(200).json(totalMilk);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};


const getAverageFatByAdmin = async (req, res) => {
    const { start, end } = req.query;

    try {
        const token = req.headers.authorization.split(' ')[1];
        const admin_id = jwt.decode(token).admin_id;

        let totalFat, totalMilk, averageFat;

        const users = await User.find({ adminId: admin_id });
        const userIds = users.map((user) => user._id);

        totalMilk = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: { $in: userIds }, // Filter collections by userIds array
                    fat: { $ne: 0 },
                    snf: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalMilk: {
                        $sum: '$qty',
                    },
                },
            },
        ]);

        totalFat = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: { $in: userIds },
                    fat: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalFat: {
                        $sum: { $multiply: ['$qty', '$fat'] }, // Calculate totalFat as qty * fat
                    },
                },
            },
        ]);

        if (totalFat.length === 0 || totalMilk.length === 0) return 0

        averageFat = (totalFat[0].totalFat / totalMilk[0].totalMilk).toFixed(2);

        res.status(200).json(averageFat);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};

const getAverageFatByUser = async (req, res) => {
    const { start, end } = req.query;

    try {
        const { username } = req.params

        let averageFat, totalMilk, totalFat;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        totalMilk = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: user._id, // Filter collections by userIds array
                    fat: { $ne: 0 },
                    snf: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalMilk: {
                        $sum: '$qty',
                    },
                },
            },
        ]);

        totalFat = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: user._id,
                    fat: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalFat: {
                        $sum: { $multiply: ['$qty', '$fat'] }, // Calculate totalFat as qty * fat
                    },
                },
            },
        ]);

        if (totalFat.length === 0 || totalMilk.length === 0) return 0

        averageFat = (totalFat[0].totalFat / totalMilk[0].totalMilk).toFixed(2);


        res.status(200).json(averageFat);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};


const getAverageSNFByAdmin = async (req, res) => {
    const { start, end } = req.query;

    try {
        const token = req.headers.authorization.split(' ')[1];
        const admin_id = jwt.decode(token).admin_id;

        let totalMilk, averageSNF, totalSNF;

        const users = await User.find({ adminId: admin_id });
        const userIds = users.map((user) => user._id);

        totalMilk = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: { $in: userIds }, // Filter collections by userIds array
                    fat: { $ne: 0 },
                    snf: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalMilk: {
                        $sum: '$qty',
                    },
                },
            },
        ]);

        totalSNF = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: { $in: userIds },
                    fat: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalSNF: {
                        $sum: { $multiply: ['$qty', '$snf'] }, // Calculate totalFat as qty * fat
                    },
                },
            },
        ]);
        if (totalSNF.length === 0 || totalMilk.length === 0) return 0

        averageSNF = (totalSNF[0].totalSNF / totalMilk[0].totalMilk).toFixed(2);
        res.status(200).json(averageSNF);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};

const getAverageSNFByUser = async (req, res) => {
    const { start, end } = req.query;

    try {
        const { username } = req.params

        let averageSNF, totalMilk, totalSNF;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        totalMilk = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: user._id, // Filter collections by userIds array
                    fat: { $ne: 0 },
                    snf: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalMilk: {
                        $sum: '$qty',
                    },
                },
            },
        ]);

        totalSNF = await Collection.aggregate([
            {
                $match: {
                    collectionDate: {
                        $gte: new Date(start),
                        $lte: new Date(end),
                    },
                    userId: user._id,
                    fat: { $ne: 0 }
                },
            },
            {
                $group: {
                    _id: null,
                    totalSNF: {
                        $sum: { $multiply: ['$qty', '$snf'] }, // Calculate totalFat as qty * fat
                    },
                },
            },
        ]);

        if (totalSNF.length === 0 || totalMilk.length === 0) return 0
        averageSNF = (totalSNF[0].totalSNF / totalMilk[0].totalMilk).toFixed(2);

        res.status(200).json(averageSNF);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'An error occurred while processing the request',
        });
    }
};

const getAllCollectionsForUser = async (req, res) => {
    try {
        const {username} = req.params
        const { startDate, endDate, shift } = req.query;
        const formattedStartDate = new Date(startDate);
        const formattedEndDate = new Date(endDate);

        if (isNaN(formattedStartDate) || isNaN(formattedEndDate)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        formattedStartDate.setHours(0, 0, 0, 0);
        formattedEndDate.setHours(23, 59, 59, 59);

        const user = await User.findOne({username})
        if (!user)
        {
            return res.status(404).json({message: 'User not found'})
        }

        const collections = await Collection.find({
            userId: user._id,
            shift: shift !== "Both" ? shift : { $exists: true },
            collectionDate: {
                $gte: formattedStartDate,
                $lte: formattedEndDate,
            },
        })
        .sort({ collectionDate: 1, createdAt: 1 })

        return res.status(200).json(collections)
    }
    catch(error)
    {
        console.log(error)
        res.status(500).json({
            error: 'An error occurred while processing the request',
        })
    }
}

const getAllCollectionsForAdmin = async (req, res) => {
    try {
        const { startDate, endDate, shift } = req.query;
        const formattedStartDate = new Date(startDate);
        const formattedEndDate = new Date(endDate);
        const token = req.headers.authorization.split(' ')[1];
        const admin_id = jwt.decode(token).admin_id;

        if (isNaN(formattedStartDate) || isNaN(formattedEndDate)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        formattedStartDate.setHours(0, 0, 0, 0);
        formattedEndDate.setHours(23, 59, 59, 59);

        const collections = await Report.find({
            adminId: admin_id,
            shift: shift !== "Both" ? shift : { $exists: true },
            date: {
                $gte: formattedStartDate,
                $lte: formattedEndDate,
            },
        })
        .sort({ date: 1})

        return res.status(200).json(collections)
    }
    catch(error)
    {
        console.log(error)
        res.status(500).json({
            error: 'An error occurred while processing the request',
        })
    }
}

module.exports = { addCollection, getAllCollectionsForDate, getAllCollectionsForUser, getAllCollectionsForAdmin, getTotalMilkByAdmin, getTotalMilkByUser, getAverageFatByAdmin, getAverageFatByUser, getAverageSNFByAdmin, getAverageSNFByUser, updateCollection, getCollectionById, deleteCollection }
