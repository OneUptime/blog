# Validation Summary: How to Set Up Automated Container Base Image Updates

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Artifact Registry
- Artifact Analysis / Container Scanning
- Cloud Build
- Cloud Scheduler
- Pub/Sub
- Cloud Functions
- Docker / Dockerfile
- Node.js, npm, Python, Go

## Sources Consulted
- Google Cloud SDK reference: Artifact Registry repositories create: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK reference: Artifact Registry Docker image scan: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- Google Cloud SDK reference: Artifact Registry Docker image list-vulnerabilities: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list-vulnerabilities
- Google Cloud SDK reference: Artifact Registry vulnerabilities list: https://cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Cloud Artifact Analysis container scanning overview: https://cloud.google.com/artifact-analysis/docs/container-scanning-overview
- Google Cloud Artifact Analysis on-demand scanning with Cloud Build: https://cloud.google.com/artifact-analysis/docs/ods-cloudbuild
- Google Cloud Artifact Registry remote repositories: https://cloud.google.com/artifact-registry/docs/repositories/remote-repo
- Google Cloud Artifact Registry virtual repositories: https://cloud.google.com/artifact-registry/docs/repositories/virtual-repo
- Google Cloud Build Python client reference: https://cloud.google.com/python/docs/reference/cloudbuild/latest/google.cloud.devtools.cloudbuild_v1.services.cloud_build.CloudBuildClient
- Google Cloud Build triggers.run REST reference: https://cloud.google.com/build/docs/api/reference/rest/v1/projects.triggers/run
- Google Cloud Scheduler HTTP authentication docs: https://cloud.google.com/scheduler/docs/http-target-auth
- Google Cloud SDK reference: Cloud Scheduler HTTP jobs: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Google Cloud SDK reference: Artifact Registry Docker tags add: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/add
- Dockerfile reference: https://docs.docker.com/reference/builder
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci
- Node.js release schedule and EOL information: https://nodejs.org/en/about/previous-releases
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The original base image examples used `node:20-alpine`, but Node.js 20 is end-of-life by the review date. Updated Node examples to `node:24-alpine`.
- The dependency map used `golang:1.21-alpine`, which is outside Go's supported release window. Updated it to `golang:1.26-alpine`.
- The setup commands assumed vulnerability scanning without enabling Container Scanning or repository scanning. Added `gcloud services enable containerscanning.googleapis.com` and `--allow-vulnerability-scanning`.
- The Cloud Build pipeline pushed the curated image before policy approval and used `list-vulnerabilities` with an image URI. Updated the flow to run On-Demand Scanning first, read vulnerabilities from the scan resource, and push only after policy checks pass.
- The Pub/Sub publish step tried to run `$(date ...)` without a shell. Updated the step to use a bash entrypoint so the timestamp is evaluated.
- The Cloud Build Python sample imported the client from the wrong module path and iterated `list_build_triggers` as if it returned a response object with `.triggers`. Updated the import and iteration to match the Python client library.
- The Dockerfile used package version pins that are unlikely to exist in current Alpine-based Node images, used `npm ci --production`, and used a shell command inside `LABEL`. Updated package installation, changed npm to `--omit=dev`, and used Docker build args for labels.
- The Dockerfile used a pre-`FROM` `ARG` in later instructions without re-declaring it after `FROM`. Added the post-`FROM` `ARG` declaration.
- The remote Docker repository command used the wrong Docker Hub enum spelling for gcloud examples. Updated it to `DOCKER-HUB`.
- The virtual repository upstream policy JSON used an incorrect wrapper object and had priority values reversed. Updated it to the documented array format and made the curated repository higher priority.
- The Cloud Scheduler command omitted `--location` and used the older Cloud Build trigger run URL form. Updated it to the regional trigger endpoint and a trigger ID placeholder.
- The rollback example still referenced the old Node 20 tag after the runtime update. Updated it to Node 24.

## Review Notes
The guide is technically valid after edits. In a production implementation, the Cloud Function should avoid listing all triggers inside each loop iteration and should account for regional Cloud Build triggers by using the appropriate regional endpoint or resource names.
