const path = require("path");
const fs = require("fs");
const nj = require("nunjucks");

async function populateTemplateFiles(
  certificationName,
  templateVersion,
  objs,
  templateDir
) {
  let filesToWrite = {};

  const templateFiles = await fs.promises.readdir(
    `${templateDir}/v${templateVersion}`
  );

  for (let i = 0; i < templateFiles.length; i++) {
    const objectKey = templateFiles[i].replace(".", "");
    const newContent = nj.render(
      path.resolve(templateDir, `v${templateVersion}`, templateFiles[i]),
      {
        certificationName,
        objs,
      }
    );

    filesToWrite[objectKey] = newContent;
  }

  return filesToWrite;
}

module.exports = { populateTemplateFiles };
