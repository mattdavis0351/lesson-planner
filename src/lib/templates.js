const fs = require("fs");
const nj = require("nunjucks");

function populateTemplateFiles(
  certificationName,
  templateVersion,
  objs,
  templateDir
) {
  let filesToWrite = {};

  const templateFiles = fs.readdirSync(`${templateDir}/v${templateVersion}`);

  for (let i = 0; i < templateFiles.length; i++) {
    const objectKey = templateFiles[i].replace(".", "").toLowerCase();
    const contents = fs.readFileSync(
      `${templateDir}/v${templateVersion}/${templateFiles[i]}`
    );
    console.log("nj currently templating " + templateFiles[i]);
    const newContent = nj.renderString(contents.toString(), {
      certificationName,
      objs,
    });

    filesToWrite[objectKey] = newContent;
  }
  console.log("nj object to return is");
  console.log(filesToWrite);
  return filesToWrite;
}

module.exports = { populateTemplateFiles };
