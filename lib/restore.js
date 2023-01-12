const downloadS3 = require("./download-s3");
const decorateWithIamToken = require("./iam");
const pgrestore = require("./pgrestore");
const mongorestore = require("./mongorestore");

async function restore(config) {
  config = config.USE_IAM_AUTH === true ? decorateWithIamToken(config) : config;

  if (!config.S3_BUCKET) {
    throw new Error("S3_BUCKET not provided in the event data");
  }

  if (config.DB == "RDS") {
    if (!config.PGDATABASE) {
      throw new Error("PGDATABASE not provided in the event data");
    }

    console.log(
      `Attempting to restore ${config.RESTORE_FILE} from ${config.S3_BUCKET} to ${config.PGDATABASE}`
    );

    await pgrestore(config);
  } else if (config.DB == "MONGO" || config.DB == "DOCDB") {
    if (!config.DOCDB_CLUSTER) {
      throw new Error("DOCDB_CLUSTER not provided in the event data");
    }
    console.log(
      `Attempting to restore ${config.RESTORE_FILE} from ${config.S3_BUCKET} to ${config.DOCDB_CLUSTER}`
    );

    await mongorestore(config);
  }
}

module.exports = restore;
