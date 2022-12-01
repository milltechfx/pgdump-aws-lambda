const utils = require("./utils");
const uploadS3 = require("./upload-s3");
const encryption = require("./encryption");
const decorateWithIamToken = require("./iam");
const pgdump = require("./pgdump");

async function backup(config) {
  config = config.USE_IAM_AUTH === true ? decorateWithIamToken(config) : config;

  if (!config.PGDATABASE) {
    throw new Error("PGDATABASE not provided in the event data");
  }
  if (!config.S3_BUCKET) {
    throw new Error("S3_BUCKET not provided in the event data");
  }

  const key = utils.generateBackupPath(
    config.STACK_NAME,
    config.PGDATABASE,
    config.ROOT
  );

  // spawn the pg_dump process
  let stream = await pgdump(config);
  if (config.ENCRYPT_KEY && encryption.validateKey(config.ENCRYPT_KEY)) {
    // if encryption is enabled, we generate an IV and store it in a separate file
    const iv = encryption.generateIv();
    const ivKey = key + ".iv";

    await uploadS3(iv.toString("hex"), config, ivKey);
    stream = encryption.encrypt(stream, config.ENCRYPT_KEY, iv);
  }
  // stream the backup to S3
  return uploadS3(stream, config, key);
}

module.exports = backup;
