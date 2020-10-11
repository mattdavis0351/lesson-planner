const fs = require("fs");
const yaml = require("js-yaml");

async function parseCourseConfigFile() {
  try {
    let fileContents = await fs.promises.readFile(
      `${process.env.GITHUB_WORKSPACE}/docsifyConfig.yml`,
      "utf8"
    );
    let data = yaml.safeLoad(fileContents);

    return data;
  } catch (e) {
    console.log(e);
  }
}

module.exports = { parseCourseConfigFile };
