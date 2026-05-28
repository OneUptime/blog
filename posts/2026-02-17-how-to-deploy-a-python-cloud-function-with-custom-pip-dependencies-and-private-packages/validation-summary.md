# Validation Summary: How to Deploy a Python Cloud Function with Custom pip Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run functions / Cloud Functions Gen 2
- Python 3.12
- pip and requirements.txt
- pip-tools / pip-compile
- Google Artifact Registry Python repositories
- Cloud Build
- GitHub VCS package installs
- Docker and Cloud Run

## Sources Consulted
- Google Cloud Run functions Python dependencies documentation: https://cloud.google.com/run/docs/runtimes/python-dependencies
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions build process overview: https://cloud.google.com/functions/docs/building
- Google Cloud Run build functions into containers documentation: https://cloud.google.com/run/docs/building/functions
- Google Cloud Run container deployment documentation: https://cloud.google.com/run/docs/deploying
- Google Artifact Registry Python package documentation: https://cloud.google.com/artifact-registry/docs/python/manage-packages
- Google Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account-updates
- pip requirements file format documentation: https://pip.pypa.io/en/stable/reference/requirements-file-format/
- pip VCS support documentation: https://pip.pypa.io/en/stable/topics/vcs-support/

## Issues Found
- The Artifact Registry example used a `pip.conf` file placed in the function source directory. pip does not read an arbitrary source-directory `pip.conf` by default, and the Cloud Run functions documentation shows repository URLs in `requirements.txt`. Changed the example to put `--extra-index-url` in `requirements.txt`.
- The Artifact Registry IAM example assumed the legacy `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com` service account. Cloud Build default service account behavior changed in 2024 and can use the Compute Engine default service account or a user-specified account. Changed the example to use `gcloud builds get-default-service-account`.
- The private GitHub example incorrectly used `PIP_EXTRA_INDEX_URL` for a GitHub repository URL. That environment variable is for package indexes, not VCS URLs. Changed the example to set `GITHUB_TOKEN` and reference it from a pip VCS requirement using `${GITHUB_TOKEN}`.
- The native extension explanation implied Cloud Build compiles most popular native packages. In practice, most popular packages install successfully because compatible wheels are available. Updated the wording and clarified when vendoring or a custom container is needed.
- The custom Docker image section built an image but then used `gcloud functions deploy --source` with `--docker-registry`, which configures where function build images are stored and does not deploy the prebuilt custom image. Changed the deployment example to use `gcloud run deploy --image` for the custom container.
- The custom container command hardcoded port 8080. Cloud Run containers should listen on the port specified by the `PORT` environment variable. Changed the Dockerfile command to use `${PORT:-8080}`.

## Review Notes
The corrected custom container path deploys to Cloud Run rather than `gcloud functions deploy`, while still using the Functions Framework handler model. For sensitive package credentials, a future improvement would be to avoid long-lived personal access tokens and prefer short-lived credentials or a managed private package repository where possible.
