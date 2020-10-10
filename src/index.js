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
console.log("templateDir is " + templateDir);
console.log("getting input variables");
const GITHUB_TOKEN = core.getInput("github-token");
const octokit = github.getOctokit(GITHUB_TOKEN);
const ctx = github.context;

async function run() {
  console.log("inside run func");
  try {
    // Read course.yml
    // certificationName = string, templateVersion = number, objectives = array
    console.log("parsing course.yml with pargecourseconfigfile()");
    const {
      certificationName,
      templateVersion,
      objectives,
    } = await parseCourseConfigFile();

    // Create new object contianing the objective names as keys and the slugified version as values
    console.log("creating new empty object for objectives");
    let objs = {};

    console.log("looping through objectives to create new obj object");
    for (let i = 0; i < objectives.length; i++) {
      let slug = slugify(objectives[i]);

      objs[objectives[i]] = slug;
    }

    // Populate templates with data from course.yml and return an object
    console.log(
      "trying to populate template files with populateTemplateFiles()"
    );
    const fileContentsToWrite = populateTemplateFiles(
      certificationName,
      templateVersion,
      objs,
      templateDir
    );

    console.log(`file contents object in main func is:`);
    console.log(fileContentsToWrite);
    // fileContentsToWrite has these keys
    //     'nojekyll',
    //     'readmemd',
    //     '_glossarymd',
    //     '_sidebarmd',
    //     'indexhtml',
    //     'lesson-planmd',
    //     'lesson-plannercss'

    // Use the GitHub API to get the directories and files in the root of the repo
    console.log(`current branch is ${ctx.ref}`);
    console.log("checking for docs folder in repo");
    const docsFolder = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      ref: ctx.ref,
    });
    console.log("docs folder api call complete");
    console.log(docsFolder.data);

    // Check for docs foler, if it does NOT exist, create it and populate it with the initial
    // template files needed for Docsify
    if (!docsFolder.data.some((dir) => dir.path === "docs")) {
      console.log("docs folder does not exist, setting up initial templates");
      console.log("writing empy .nojekyll file");
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
      console.log("writing glossary file");
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
      console.log("writing readme file");
      const readmeRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/README.md",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["readmemd"]).toString(
          "base64"
        ),
        branch: ctx.ref,
      });
      console.log("writing index file");
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
      console.log("writing css file");
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
    } else {
      console.log("docs folder does exist, skipping template file scaffolding");
    }

    // Always recreate the sidebar, this will allow easy updates when objectives
    // Are added to thr course.yml
    // Read docs folder to see if sidebar exists
    const sidebarCheck = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      ref: ctx.ref,
      path: "docs",
    });
    // if sidebar, then read it for the sha
    if (sidebarCheck.data.some((file) => file.name === "_sidebar.md")) {
      console.log("Getting the sidebar");
      const sidebar = await octokit.repos.getContent({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        ref: ctx.ref,
        path: "docs/_sidebar.md",
      });

      console.log("updating existing sidebar file");
      const sidebarRes = await octokit.repos.createOrUpdateFileContents({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        path: "docs/_sidebar.md",
        message: "initial template setup",
        content: Buffer.from(fileContentsToWrite["_sidebarmd"]).toString(
          "base64"
        ),
        branch: ctx.ref,
        sha: sidebar.data.sha,
      });
    } else {
      // if not sidebar then just create a new one with no sha
      console.log("writing a new sidebar file");
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
    }

    //   Make GitHub API call to get the files present in the docs folder
    console.log("reading contents of docs folder");
    const lessonPlans = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      ref: ctx.ref,
      path: "docs",
    });
    console.log(lessonPlans);

    // For each objective we need to see if it already exists in the repo to
    // Prevent overwriting a lesson plan with the template
    console.log("beginning loop to check for objective files in docs folder");
    for (let i = 0; i < objectives.length; i++) {
      // Check to see if a lesson plan with the current name already exists in the docs folder
      // If it does not exist, then create one with the template on the current branch
      if (
        !lessonPlans.data.some(
          (lessonPlan) => lessonPlan.name === `${slugify(objectives[i])}.md`
        )
      ) {
        console.log(
          "tryign to write " + slugify(objectives[i]) + ".md to docs folder"
        );
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
        console.log(
          `${slugify(
            objectives[i]
          )}.md already exists, skipping to next objective`
        );
        // If it does exist then continue through the remaining files
        continue;
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run();
