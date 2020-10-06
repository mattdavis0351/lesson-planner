const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");

const { parseCourseConfigFile } = require("./lib/parser");
const {
  populateTemplateFiles,
  doesLessonPlanExist,
} = require("./lib/templates");
const templateDir = path.resolve(
  path.dirname(__dirname),
  "src",
  "lib",
  "templates"
);
const GITHUB_TOKEN = core.getInput("github-token");
const octokit = github.getOctokit(GITHUB_TOKEN);
const ctx = github.context;

async function run() {
  try {
    const {
      certificationName,
      templateVersion,
      objectives,
    } = await parseCourseConfigFile();

    const fileContentsToWrite = await populateTemplateFiles(
      certificationName,
      templateVersion,
      objectives,
      templateDir
    );

    // fileContentsToWrite has these keys
    //     'nojekyll',
    //     'READMEmd',
    //     '_glossarymd',
    //     '_sidebarmd',
    //     'indexhtml',
    //     'lesson-planmd',
    //     'lesson-plannercss'

    const { data } = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      branch: ctx.ref,
    });

    if (!data.some((dir) => dir.path === "docs")) {
      const jekyllRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/.nojekyll",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["nojekyll"]).toString(
          "base64"
        ),
        branch: ctx.ref,
      });

      const glossaryRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/_glossary.md",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["_glossarymd"]).toString(
          "base64"
        ),
        branch: ctx.ref,
      });
      const readmeRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/README.md",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["READMEmd"]).toString(
          "base64"
        ),
        branch: ctx.ref,
      });
      const indexRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/index.html",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["indexhtml"]).toString(
          "base64"
        ),
        branch: ctx.ref,
      });

      const cssRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/lesson-planner.css",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["lesson-plannercss"]).toString(
          "base64"
        ),
        branch: ctx.ref,
      });
    }

    const sidebarRes = await octokit.repos.createOrUpdateFileContents({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      path: "docs/_sidebar.md",
      message: "initial template setup",
      content: Buffer.from(fileContentsToWrite["_sidebarmd"]).toString(
        "base64"
      ),
      branch: ctx.ref,
    });

    for (let i = 0; i < objectives.length; i++) {
      const alreadyExists = await doesLessonPlanExist(
        path.resolve(`docs/${objectives[i]}.md`)
      );
      if (!alreadyExists) {
        const res = await octokit.repos.createOrUpdateFileContents({
          owner: ctx.repo.owner,
          repo: ctx.repo.repo,
          path: `docs/${objectives[i]}.md`,
          message: "initial template setup",
          content: Buffer.from(fileContentsToWrite["lesson-planmd"]).toString(
            "base64"
          ),
          branch: ctx.ref,
        });
      } else {
        continue;
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run();
