const moment = require("moment");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

module.exports = {
  generateBackupPath(
    stackName,
    databseType,
    databaseName,
    rootPath,
    now = null
  ) {
    now = now || moment().utc();
    const timestamp = moment(now).format("DD-MM-YYYY-HH-mm-ss");
    const filename = `${stackName}_${databseType}_${databaseName}_${timestamp}.backup`;
    const key = path.join(rootPath || "", filename);
    return key;
  },

  spawnChildProcess(exeDir, exeName, args, env) {
    const exePath = path.join(exeDir, exeName);
    if (!fs.existsSync(exePath)) {
      throw new Error(`${exeName} not found at ${exePath}`);
    }
    return spawn(exePath, args, {
      env,
      shell: true,
    });
  },
};
