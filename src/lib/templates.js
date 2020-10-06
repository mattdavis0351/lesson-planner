const path = require("path");
const fs = require("fs");
const nj = require("nunjucks");

async function populateTemplateFiles(
  certificationName,
  templateVersion,
  objectives,
  templateDir
) {
  let filesToWrite = {};

  const templateFiles = await fs.promises.readdir(
    path.resolve(templateDir, `v${templateVersion}`)
  );

  for (let i = 0; i < templateFiles.length; i++) {
    const objectKey = templateFiles[i].replace(".", "");
    const newContent = nj.render(
      path.resolve(templateDir, `v${templateVersion}`, templateFiles[i]),
      {
        certificationName,
        objectives,
      }
    );

    filesToWrite[objectKey] = newContent;
  }

  return filesToWrite;
}

async function doesLessonPlanExist(filepath) {
  try {
    await fs.promises.access(filepath, fs.constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    } else {
      throw error;
    }
  }
}

module.exports = { populateTemplateFiles, doesLessonPlanExist };
