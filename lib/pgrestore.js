const { Transform } = require("stream");
const utils = require("./utils");

function buildArgs(config) {
  let args = [
    // https://www.postgresql.org/docs/13/app-pgrestore.html
    // "-a",
    "-c",
    "--if-exists",
    "-v",
    "-1",
    `-d${config.PGDATABASE}`,
    `-h${config.PGHOST}`,
    `-U${config.PGUSER}`,
    "/tmp/filename.backup",
  ];
  const extraArgs = config.PGRESTORE_ARGS;

  if (typeof extraArgs === "string") {
    const splitArgs = extraArgs.split(" ");
    args = args.concat(splitArgs);
  } else if (Array.isArray(extraArgs)) {
    args = args.concat(extraArgs);
  }

  return args;
}

function pgrestore(config) {
  return new Promise((resolve, reject) => {
    let headerChecked = false;
    let stderr = "";

    // spawn pg_restore process
    const args = buildArgs(config);
    const env = { ...config, LD_LIBRARY_PATH: config.PGRESTORE_PATH };
    const process = utils.spawnChildProcess(
      config.PGRESTORE_PATH,
      "pg_restore",
      args,
      env
    );

    // hook into the process
    process.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });

    process.on("close", (code) => {
      // reject our promise if pg_restore had a non-zero exit
      if (code !== 0) {
        return reject(new Error("pg_restore process failed: " + stderr));
      }
      // check that pgrestore actually gave us some data
      // if (!headerChecked) {
      //   return reject(new Error("pg_restore gave us an unexpected response"));
      // }
    });

    // watch the pg_restore stdout stream so we can check it's valid
    const transformer = new Transform({
      transform(chunk, enc, callback) {
        this.push(chunk);
        // if stdout begins with 'pg_restore' then the restore has begun
        // otherwise, we abort
        if (!headerChecked) {
          headerChecked = true;
          if (chunk.toString("utf8").startsWith("pg_restore")) {
            resolve(transformer);
          } else {
            reject(new Error("pg_restore gave us an unexpected response"));
          }
        }
        callback();
      },
    });

    // pipe pg_restore to transformer
    process.stdout.pipe(transformer);
  });
}

module.exports = pgrestore;
