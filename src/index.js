const path = require("path");
const github = require("@actions/github");
const core = require("@actions/core");
const slugify = require("slugify");

const { parseCourseConfigFile } = require("./lib/parser");
const { populateTemplateFiles } = require("./lib/templates");

const templateDir = path.resolve("src", "lib", "templates");
const GITHUB_TOKEN = core.getInput("github-token");
const octokit = github.getOctokit(GITHUB_TOKEN);
const ctx = github.context;

async function run() {
  try {
    // Read course.yml
    // certificationName = string, templateVersion = number, objectives = array
    const {
      certificationName,
      templateVersion,
      pageTitles,
    } = await parseCourseConfigFile();

    // Create new object contianing the objective names as keys and the slugified version as values
    const filesToServe = Object.assign(
      {},
      ...pageTitles.map((obj) => {
        return { [obj]: slugify(obj) };
      })
    );

    // Populate templates with data from course.yml and return an object
    const fileContentsToWrite = populateTemplateFiles(
      certificationName,
      templateVersion,
      filesToServe,
      templateDir
    );

    const docsFolder = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      ref: ctx.ref,
    });

    // Check for docs foler, if it does NOT exist, create it and populate it with the initial
    // template files needed for Docsify
    if (!docsFolder.data.some((dir) => dir.path === "docs")) {
      console.log("docs folder does not exist, setting up initial templates");
      console.log("writing nojekyll file");
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
      console.log("docs folder does exist, skipping initial template setup");
      // TODO
      // Verify the template version number
      // if it is different from master copy over new template files
      // can probably be done with OR statement in top level condition check
      // data.content is encoded content of file
      // pass to parser to get version out and then compare
    }

    // Always recreate the sidebar, this will allow easy updates when objectives
    // Are added to thr course.yml
    // Read docs folder to see if sidebar exists
    const docsContent = await octokit.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      ref: ctx.ref,
      path: "docs",
    });
    // if sidebar, then read it for the sha
    if (docsContent.data.some((file) => file.name === "_sidebar.md")) {
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

    // For each objective we need to see if it already exists in the repo to
    // Prevent overwriting a lesson plan with the template
    console.log("Creating files to serve");
    for (let i = 0; i < objectives.length; i++) {
      // Check to see if a lesson plan with the current name already exists in the docs folder
      // If it does not exist, then create one with the template on the current branch
      const filenameSlug = slugify(objectives[i]);
      if (
        !docsContent.data.some(
          (lessonPlan) => lessonPlan.name === `${filenameSlug}.md`
        )
      ) {
        console.log("trying to write " + filenameSlug + ".md to docs folder");
        const res = await octokit.repos.createOrUpdateFileContents({
          owner: ctx.repo.owner,
          repo: ctx.repo.repo,
          path: `docs/${filenameSlug}.md`,
          message: "initial template setup",
          content: Buffer.from(fileContentsToWrite["lesson-planmd"]).toString(
            "base64"
          ),
          branch: ctx.ref,
        });
      } else {
        console.log(
          `${filenameSlug}.md already exists, skipping to next objective`
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
