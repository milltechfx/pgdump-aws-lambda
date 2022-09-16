const moment = require("moment");
const path = require("path");

module.exports = {
  generateBackupPath(stackName, databaseName, rootPath, now = null) {
    now = now || moment().utc();
    const timestamp = moment(now).format("DD-MM-YYYY-HH-mm-ss");
    const filename = `${stackName}_SQL_${databaseName}_${timestamp}.backup`;
    const key = path.join(rootPath || "", filename);
    return key;
  },
};
