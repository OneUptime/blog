# Validation Summary: How to Configure Epinio Buildpacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Epinio
- Cloud Native Buildpacks
- Paketo Buildpacks
- Kubernetes
- Node.js

## Sources Consulted
- Epinio Quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio single developer workflow: https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio custom builder guide: https://docs.epinio.io/howtos/customization/custom_builder
- Paketo Node.js Buildpack reference: https://paketo.io/docs/reference/nodejs-reference/

## Issues Found
- The original shell-script example used `app.sh` with `nc`, but Epinio documents buildpack-based deployment of supported applications, and this example did not represent a supported Epinio buildpack workflow. I replaced it with a minimal `package.json` so the Node.js example is detected and launched reliably by the Node.js buildpack.
- The route lookup commands were incorrect. `epinio app show` prints `Routes:` on one line and the actual URL on the next line, so `grep Routes | awk '{print $2}'` would not return the application URL. I changed the commands to read the route from the next line.
- The live-log example used `epinio app logs my-app --follow`. I changed it to `epinio app logs --follow my-app` to match the documented command form.
- The update section claimed that Epinio performs a rolling update. I changed this to the less specific and accurate statement that Epinio deploys the updated application revision, because the reviewed documentation did not explicitly guarantee rolling-update behavior.
- The description and supporting copy overstated the article as a buildpack-configuration guide. I narrowed that wording to describe Epinio's buildpack-based deployment workflow, which is what the post now accurately demonstrates.

## Review Notes
- The post is technically relevant and salvageable, but it focuses more on deploying an application with Epinio's buildpack-based workflow than on advanced buildpack customization. The official Epinio customization path for buildpacks is the `--builder-image` option with a custom builder image, documented in the custom builder guide.
