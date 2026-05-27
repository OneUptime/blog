# Validation Summary: How to Set Up Cloud Build Triggers for Automatic Builds on GitHub Push Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Cloud CLI
- GitHub
- Cloud Build triggers
- Cloud Build configuration files
- Docker
- Artifact Registry
- Node.js

## Sources Consulted
- Google Cloud Build: Connect to a GitHub repository: https://docs.cloud.google.com/build/docs/automating-builds/github/connect-repo-github
- Google Cloud Build: Create and manage build triggers: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud SDK reference: gcloud builds triggers create github: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build: Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build: Substituting variable values: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values

## Issues Found
- The complete example repository tree placed `package.json` inside `src/`, but the Dockerfile copies `package*.json` from the repository root and the PR build runs `npm ci` from the default workspace root. I moved `package.json` to the root in the tree so the examples are consistent and would work as written.

## Review Notes
- The `gcloud builds triggers create github` examples use the 1st-generation GitHub repository flags `--repo-name` and `--repo-owner`, which are still documented. For new setups, teams may also consider 2nd-generation Cloud Build repositories and the `--repository` flag where appropriate.
- Cloud Source Repositories is unavailable to new customers as of June 17, 2024, so the post correctly discourages new GitHub mirrored setups.
