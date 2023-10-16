const Report = require("../model/Report");
const User = require("../model/User");

const getReportByShift = async (req, res) => {
  try {
    const { username } = req.params;
    const { shift, date } = req.query;
    const user = User.findOne({ username });
    const formattedDate = new Date(date);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const report = await Report.findOne({
      username,
      shift,
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$date" }, { $dayOfMonth: formattedDate }] },
          { $eq: [{ $month: "$date" }, { $month: formattedDate }] },
          { $eq: [{ $year: "$date" }, { $year: formattedDate }] },
        ],
      },
    });

    console.log(report)

    return res.status(200).json(report)
  } catch (err) {
    console.log(error);
    res.status(500).json({
        error: 'An error occurred while processing the request',
    });
  }
};

const getReportByDate = async (req, res) => {
    try {
      const { username } = req.params;
      const { date } = req.query;
      const user = User.findOne({ username });
      const formattedDate = new Date(date);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const report = await Report.findOne({
        username,
        $expr: {
          $and: [
            { $eq: [{ $dayOfMonth: "$date" }, { $dayOfMonth: formattedDate }] },
            { $eq: [{ $month: "$date" }, { $month: formattedDate }] },
            { $eq: [{ $year: "$date" }, { $year: formattedDate }] },
          ],
        },
      });

  
      return res.status(200).json(report)
    } catch (err) {
      console.log(error);
      res.status(500).json({
          error: 'An error occurred while processing the request',
      });
    }
  };

module.exports = getReportByShift
