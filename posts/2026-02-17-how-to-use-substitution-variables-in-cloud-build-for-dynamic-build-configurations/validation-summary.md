# Validation Summary: How to Use Substitution Variables in Cloud Build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Cloud Build substitutions
- Cloud Build triggers
- Google Cloud CLI (`gcloud`)
- Artifact Registry image names
- Cloud Run deployment commands
- YAML build configuration
- Bash scripts in build steps

## Sources Consulted
- Google Cloud Build documentation: Substituting variable values - https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build documentation: Build configuration file schema - https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud CLI reference: `gcloud builds submit` - https://cloud.google.com/sdk/gcloud/reference/builds/submit
- Google Cloud CLI reference: `gcloud builds triggers create github` - https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud CLI reference: `gcloud run deploy` - https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Build documentation: Create and manage build triggers - https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers

## Issues Found
- The post said built-in variables could be referenced anywhere in `cloudbuild.yaml`. Cloud Build documents substitutions for supported build fields such as build step arguments and image names, so the statement was narrowed to those supported fields.
- The post implied `$HOME` and `$PATH` inside script blocks would simply behave as shell variables. Cloud Build treats dollar-prefixed expressions as substitutions unless escaped, so the wording was corrected to say shell variables should be written as `$$HOME` or `$$PATH` when the shell should receive them.
- The post said an undefined substitution with no default is left as a literal string. Cloud Build returns an error by default for missing substitutions; triggered builds use `ALLOW_LOOSE` by default. The debugging guidance was corrected to reflect that behavior.

## Review Notes
- The `gcloud` CLI is not installed in this workspace, so command validation was done against the official Google Cloud CLI reference rather than local `--help` output.
- The `$BRANCH_NAME` image tag examples are syntactically valid for simple branch names like `main`, but real branch names containing characters invalid in Docker tags, such as `/`, need sanitization before being used as image tags.
