const { Transform } = require("stream");
const utils = require("./utils");

function buildArgs(config) {
  let args = [
    `--uri ${config.MONGO_URI}`,
    `--username ${config.MONGO_USER}`,
    `--password "${config.MONGO_PASSWORD}"`,
  ];

  const extraArgs = config.MONGORESTORE_ARGS;

  if (typeof extraArgs === "string") {
    const splitArgs = extraArgs.split(" ");
    args = args.concat(splitArgs);
  } else if (Array.isArray(extraArgs)) {
    args = args.concat(extraArgs);
  }

  return args;
}

function mongorestore(config) {
  return new Promise((resolve, reject) => {
    let headerChecked = false;
    let stderr = "";

    // spawn mognorestore process
    const args = buildArgs(config);
    const env = { ...config, LD_LIBRARY_PATH: config.MOGNORESTORE_PATH };
    const process = utils.spawnChildProcess(
      config.MOGNORESTORE_PATH,
      "mongorestore",
      args,
      env
    );

    // hook into the process
    process.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });

    process.on("close", (code) => {
      // reject our promise if mognorestore had a non-zero exit
      if (code !== 0) {
        return reject(new Error("mognorestore process failed: " + stderr));
      }
      // check that pgrestore actually gave us some data
      // if (!headerChecked) {
      //   return reject(new Error("mognorestore gave us an unexpected response"));
      // }
    });

    // watch the mognorestore stdout stream so we can check it's valid
    const transformer = new Transform({
      transform(chunk, enc, callback) {
        this.push(chunk);
        // if stdout begins with 'mognorestore' then the restore has begun
        // otherwise, we abort
        if (!headerChecked) {
          headerChecked = true;
          if (chunk.toString("utf8").includes("Failed")) {
            resolve(transformer);
          } else {
            reject(new Error("mognorestore gave us an unexpected response"));
          }
        }
        callback();
      },
    });

    // pipe mognorestore to transformer
    process.stdout.pipe(transformer);
  });
}

module.exports = mongorestore;
