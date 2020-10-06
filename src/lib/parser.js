const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

async function parseCourseConfigFile() {
  try {
    console.log(path.resolve(process.env.GITHUB_WORKSPACE), "course.yml");
    // let fileContents = await fs.promises.readFile(
    //   path.resolve(process.env("GITHUB_WORKSPACE"), "course.yml"),
    //   "utf8"
    // );
    // let data = yaml.safeLoad(fileContents);

    // return data;
  } catch (e) {
    console.log(e);
  }
}

module.exports = { parseCourseConfigFile };
