# Validation Summary: How to Store and Retrieve Build Artifacts Between Cloud Build Steps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build build configuration YAML
- Cloud Build workspace and custom volumes
- Cloud Storage build artifacts
- Docker builder steps
- Go modules
- npm
- pip

## Sources Consulted
- Google Cloud Build documentation: Passing data between build steps - https://docs.cloud.google.com/build/docs/configuring-builds/pass-data-between-steps
- Google Cloud Build documentation: Build configuration file schema - https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build documentation: Storing build artifacts in Cloud Storage - https://docs.cloud.google.com/build/docs/building/store-artifacts-in-cloud-storage
- Cloud Build REST API reference: BuildStep volumes - https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.builds
- Go Modules Reference: Module cache - https://go.dev/ref/mod
- npm CLI documentation: npm ci - https://docs.npmjs.com/cli/v11/commands/npm-ci
- pip documentation: Caching - https://pip.pypa.io/en/stable/topics/caching.html

## Issues Found
- The introduction said a later step would not automatically have access to generated outputs. I clarified that this applies to outputs written outside a shared location, because Cloud Build automatically mounts `/workspace` for every step and files written there are available to later steps.
- The workspace section said source code gets cloned into `/workspace`. I changed this to "extracted" to match Cloud Build documentation, which covers source archives as well as repository sources.
- The `dir` behavior was described as always relative to `/workspace`. I narrowed this to relative `dir` values, since Cloud Build artifact paths and working directories can also involve explicitly configured working directories.
- The pip cache example installed dependencies in one container and then ran tests in a later container without reinstalling them. I changed the second step to reinstall requirements using the shared pip cache before running pytest.
- The Docker example labeled a push step as "Tag with the version." I changed the comment to "Push with the version."
- The multiple-volumes example mounted named custom volumes in only one step. Cloud Build treats a named volume used by only one step as invalid, so I added a later step that mounts the same volumes again.

## Review Notes
The examples use older but still plausible runtime image tags such as `node:18`, `python:3.11`, `golang:1.21`, and `gcr.io/$PROJECT_ID`. They are not deprecated in the Cloud Build configuration format, but future updates could modernize runtime versions and prefer Artifact Registry image names for new Google Cloud projects.
