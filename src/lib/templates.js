const fs = require("fs");
const nj = require("nunjucks");

function populateTemplateFiles(
  certificationName,
  templateVersion,
  objs,
  templateDir
) {
  const templateFiles = fs.readdirSync(`${templateDir}/v${templateVersion}`);
  const filesToWrite = templateFiles.map((file) => {
    const contents = fs
      .readFileSync(`${templateDir}/v${templateVersion}/${file}`)
      .toString();
    const objKey = file.replace(".", "").toLowerCase();
    const newContents = nj.renderString(contents, {
      certificationName,
      objs,
    });
    return { [objKey]: newContents };
  });

  return Object.assign({}, ...filesToWrite);
}

module.exports = { populateTemplateFiles };
