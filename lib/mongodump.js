const { Transform } = require("stream");
const utils = require("./utils");

function buildArgs(config) {
  let args = [
    `--uri ${config.MONGO_URI}`,
    `--username ${config.MONGO_USER}`,
    `--password "${config.MONGO_PASSWORD}"`,
    "--archive",
    "--ssl",
  ];
  const extraArgs = config.MONGODUMP_ARGS;

  if (typeof extraArgs === "string") {
    const splitArgs = extraArgs.split(" ");
    args = args.concat(splitArgs);
  } else if (Array.isArray(extraArgs)) {
    args = args.concat(extraArgs);
  }

  return args;
}

function mongodump(config) {
  return new Promise((resolve, reject) => {
    let headerChecked = false;
    let stderr = "";

    // spawn mongodump process
    const args = buildArgs(config);
    const env = { ...config, LD_LIBRARY_PATH: config.MONGODUMP_PATH };
    const process = utils.spawnChildProcess(
      config.MONGODUMP_PATH,
      "mongodump",
      args,
      env
    );

    // hook into the process
    process.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });

    process.on("close", (code) => {
      // reject our promise if mongodump had a non-zero exit
      if (code !== 0) {
        return reject(new Error("mongodump process failed: " + stderr));
      }
      // check that mongodump actually gave us some data
      if (!headerChecked) {
        return reject(new Error("mongodump gave us an unexpected response"));
      }
      return null;
    });

    // watch the mongodump stdout stream so we can check it's valid
    const transformer = new Transform({
      transform(chunk, enc, callback) {
        this.push(chunk);
        // if stdout begins with 'MONGODMP' then the backup has begun
        // otherwise, we abort
        if (!headerChecked) {
          headerChecked = true;
          if (chunk.toString("utf8").includes("Failed")) {
            reject(new Error("mongodump gave us an unexpected response"));
          } else {
            resolve(transformer);
          }
        }
        callback();
      },
    });

    // pipe mongodump to transformer
    process.stdout.pipe(transformer);
  });
}

module.exports = mongodump;
