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

  // nj.configure(__dirname + `dist/templates/v${templateVersion}`);
  for (let i = 0; i < templateFiles.length; i++) {
    console.log("using loop and nunjucks to populate templates");
    console.log("creating object keys with .replace()");
    const objectKey = templateFiles[i].replace(".", "");
    console.log("replace sucessful");
    console.log("current file nj wants to render " + templateFiles[i]);
    console.log(
      `path is currently: ${templateDir}/v${templateVersion}/${templateFiles[i]}`
    );
    const contents = fs.readdirSync(`${templateDir}/v${templateVersion}`);
    // /v${templateVersion}/${templateFiles[i]}
    console.log(`dir contents is : ${contents}`);

    console.log(path.dirname(__dirname));
    // path.resolve(path.dirname(__dirname),'dist','templates',`v${templateVersion}`,templateFiles[i])

    const newContent = nj.render(
      // path.resolve(
      `${templateDir}/v${templateVersion}/${templateFiles[i]}`,
      {
        certificationName,
        objs,
      }
    );
    console.log("nunjucks complete");

    filesToWrite[objectKey] = newContent;
  }

  return filesToWrite;
}

module.exports = { populateTemplateFiles };
