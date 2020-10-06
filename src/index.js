const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");
const slugify = require("slugify");

const { parseCourseConfigFile } = require("./lib/parser");
const { populateTemplateFiles } = require("./lib/templates");

console.log("creating template dir variable");
const templateDir = path.resolve(
  //   path.dirname(__dirname),
  "src",
  "lib",
  "templates"
);
console.log("getting input variables");
const GITHUB_TOKEN = core.getInput("github-token");
const octokit = github.getOctokit(GITHUB_TOKEN);
const ctx = github.context;

async function run() {
  console.log("inside run func");
  try {
    // Read course.yml
    // certificationName = string, templateVersion = number, objectives = array
    const {
      certificationName,
      templateVersion,
      objectives,
    } = await parseCourseConfigFile();

    // Create new object contianing the objective names as keys and the slugified version as values
    let objs = {};

    for (let i = 0; i < objectives.length; i++) {
      let slug = slugify(objectives[i]);

      objs[objectives[i]] = slug;
    }

    // Populate templates with data from course.yml and return an object
    const fileContentsToWrite = await populateTemplateFiles(
      certificationName,
      templateVersion,
      objs,
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

    // Use the GitHub API to get the directories and files in the root of the repo
    const docsFolder = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      branch: ctx.ref,
    });

    // Check for docs foler, if it does NOT exist, create it and populate it with the initial
    // template files needed for Docsify
    if (!docsFolder.data.some((dir) => dir.path === "docs")) {
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

    // Always recreate the sidebar, this will allow easy updates when objectives
    // Are added to thr course.yml
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

    // For each objective we need to see if it already exists in the repo to
    // Prevent overwriting a lesson plan with the template
    for (let i = 0; i < objectives.length; i++) {
      //   Make GitHub API call to get the files present in the docs folder
      const lessonPlans = await octokit.repos.getContent({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        branch: ctx.ref,
        path: "docs",
      });

      // Check to see if a lesson plan with the current name already exists in the docs folder
      // If it does not exist, then create one with the template on the current branch
      if (
        !lessonPlans.data.some(
          (lessonPlan) => lessonPlan.name === `${slugify(objectives[i])}.md`
        )
      ) {
        const res = await octokit.repos.createOrUpdateFileContents({
          owner: ctx.repo.owner,
          repo: ctx.repo.repo,
          path: `docs/${slugify(objectives[i])}.md`,
          message: "initial template setup",
          content: Buffer.from(fileContentsToWrite["lesson-planmd"]).toString(
            "base64"
          ),
          branch: ctx.ref,
        });
      } else {
        // If it does exist then continue through the remaining files
        continue;
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run();
