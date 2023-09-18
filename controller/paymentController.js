const Farmer = require('../model/Farmer');
const Ledger = require('../model/Ledger');
const Payment = require('../model/Payment');
const User = require('../model/User');

const settlePaymentByAdmin = async (req, res) => {
  try {
    const { farmerId, date, amountToPay, remarks } = req.body;
    const { username } = req.params
    const user = await User.findOne({ username })

    if (!user) {
      return res.status(404).send({ message: 'No user found' });
    }

    if (!farmerId || !date || !amountToPay || !remarks) {
      return res.status(400).json({
        message: 'Please provide all the details',
      });
    }

    const farmer = await Farmer.findOne({ farmerId, userId: user._id });

    if (!farmer) {
      return res.status(404).send({ message: 'No farmer found' });
    }

    let previousBalance = Number(farmer.credit) - Number(farmer.debit);

    Promise.all([
      Payment.create({
        farmerId,
        farmerName: farmer.farmerName,
        date,
        amountToPay,
        remarks,
        userId: user._id
      }),
      Ledger.create({
        farmerId,
        farmerName: farmer.farmerName,
        date,
        debit: amountToPay,
        remarks: remarks,
        userId: user._id,
        previousBalance: previousBalance,
      }),
    ]).then(() => {
      farmer.debit = farmer.debit + Number(amountToPay),
        farmer.save()
    }).finally(() => {
      return res.status(200).json({ message: 'Payment successfully made' })
    })

  } catch (error) {
    console.log(error);

    res.status(400).json({
      status: 'Error',
    });
  }
};

const settlePaymentByUser = async (req, res) => {
  try {
    const { farmerId, date, amountToPay, remarks } = req.body;
    const { username } = req.params

    const user = await User.findOne({ username })

    if (!user) {
      return res.status(404).send({ message: 'No user found' });
    }

    if (user.permissions.allowPayment === 'Not Allow') {
      return res.status(403).send({ message: 'Payment not allowed' })
    }

    if (!farmerId || !date || !amountToPay || !remarks) {
      return res.status(400).json({
        message: 'Please provide all the details',
      });
    }

    const farmer = await Farmer.findOne({ farmerId, userId: user._id });

    if (!farmer) {
      return res.status(404).send({ message: 'No farmer found' });
    }

    let previousBalance = Number(farmer.credit) - Number(farmer.debit);

    Promise.all([
      Payment.create({
        farmerId,
        farmerName: farmer.farmerName,
        date,
        amountToPay,
        remarks,
        userId: user._id
      }),
      Ledger.create({
        farmerId,
        farmerName: farmer.farmerName,
        date,
        debit: amountToPay,
        remarks: remarks,
        userId: user._id,
        previousBalance: previousBalance,
      }),
    ]).then(() => {
      farmer.debit = farmer.debit + Number(amountToPay),
        farmer.save()
    }).finally(() => {
      return res.status(200).json({ message: 'Payment successfully made' })
    })

  } catch (error) {
    console.log(error);

    res.status(400).json({
      status: 'Error',
    });
  }
};

const getPaymentByAdmin = async (req, res) => {
  try {
    const { username } = req.params;
    const { startDate, endDate } = req.query;
    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);

    if (isNaN(formattedStartDate) || isNaN(formattedEndDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set the time part of the dates to midnight (00:00:00) to compare just the date part
    formattedStartDate.setHours(0, 0, 0, 0);
    formattedEndDate.setHours(0, 0, 0, 0);

    // Adjust the end date to the start of the next day minus one millisecond
    formattedEndDate.setDate(formattedEndDate.getDate() + 1);
    formattedEndDate.setTime(formattedEndDate.getTime() - 1);

    const payments = await Payment.find({
      $and: [
        { userId: user._id },
        {
          $expr: {
            $and: [
              { $gte: ['$date', formattedStartDate] },
              { $lt: ['$date', formattedEndDate] },
            ],
          },
        },
      ],
    }).sort({ date: -1, createdAt: -1});

    res.status(200).json(payments);
  }
  catch (err) {
    console.log(err);
    res.status(400).json({
      status: 'Error',
    });
  }
}

const editPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountToPay, remarks } = req.body;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json(
        {
          message: 'Payment not found'
        }
      );
    }

    const previousAmount = payment.amountToPay;

    payment.amountToPay = amountToPay || payment.amountToPay;
    payment.remarks = remarks || payment.remarks;
    await payment.save();

    const ledger = await Ledger.findOne({
      farmerId: payment.farmerId,
      date: payment.date,
      debit: previousAmount
    });

    if (ledger) {
      ledger.debit = Number(ledger.debit - previousAmount + payment.amountToPay).toFixed(2);
      ledger.remarks = remarks || ledger.remarks;
      await ledger.save();
    }

    return res.status(200).json('Payment updated successfully');
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: 'An error occurred while processing the request',
    });
  }
};

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const paymentAmount = payment.amountToPay;

    await Payment.findByIdAndDelete(id);


    const ledger = await Ledger.findOne({
      farmerId: payment.farmerId, date: payment.date, debit: paymentAmount
    });

    console.log(ledger)

    if (ledger) {
      await Ledger.findByIdAndDelete(ledger._id);
    }

    const farmer = await Farmer.findOne(
      {
        farmerId: payment.farmerId
      });

    if (farmer) {
      farmer.debit = Number(farmer.debit - paymentAmount).toFixed(2);
      await farmer.save();
    }

    return res.status(200).json('Payment deleted successfully');
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: 'An error occurred while processing the request',
    });
  }
};


module.exports = {
  settlePaymentByAdmin,
  settlePaymentByUser,
  getPaymentByAdmin,
  editPayment,
  deletePayment
};