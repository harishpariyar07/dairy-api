module.exports.compareDate = function (date1, date2){
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear()
    ) ? true : false;
}