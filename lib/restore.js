const downloadS3 = require("./download-s3");
const decorateWithIamToken = require("./iam");
const pgrestore = require("./pgrestore");

async function restore(config) {
  config = config.USE_IAM_AUTH === true ? decorateWithIamToken(config) : config;

  if (!config.PGDATABASE) {
    throw new Error("PGDATABASE not provided in the event data");
  }
  if (!config.S3_BUCKET) {
    throw new Error("S3_BUCKET not provided in the event data");
  }
  console.log(
    `Attempting to restore ${config.RESTORE_FILE} from ${config.S3_BUCKET} to ${config.PGDATABASE}`
  );
  downloadS3(config, config.RESTORE_FILE);

  await pgrestore(config);
}

module.exports = restore;
