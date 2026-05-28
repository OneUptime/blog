# Validation Summary: How to Deploy a Node.js Application to App Engine Flexible Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google App Engine Flexible Environment
- App Engine custom runtimes
- Node.js
- Express
- Docker and Dockerfile multi-stage builds
- npm
- Google Cloud CLI
- Cloud Build
- Artifact Registry
- Google Secret Manager
- WebSockets

## Sources Consulted
- Google Cloud: About custom runtimes - https://docs.cloud.google.com/appengine/docs/flexible/custom-runtimes/about-custom-runtimes
- Google Cloud: Build custom runtimes - https://docs.cloud.google.com/appengine/docs/flexible/custom-runtimes/build
- Google Cloud: App Engine flexible app.yaml reference - https://docs.cloud.google.com/appengine/docs/flexible/reference/app-yaml
- Google Cloud: Node.js runtime for App Engine flexible environment - https://docs.cloud.google.com/appengine/docs/flexible/nodejs/runtime
- Google Cloud: Creating persistent connections with WebSockets - https://docs.cloud.google.com/appengine/docs/flexible/using-websockets-and-session-affinity
- Google Cloud SDK: gcloud app deploy - https://docs.cloud.google.com/sdk/gcloud/reference/app/deploy
- Google Cloud SDK: gcloud builds log - https://docs.cloud.google.com/sdk/gcloud/reference/builds/log
- npm CLI: npm ci - https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Docker Docs: Build context and .dockerignore - https://docs.docker.com/build/building/context/

## Issues Found
- The Dockerfile used `npm ci --only=production`. This still works in many npm versions, but current npm documentation uses `--omit=dev` for omitting development dependencies. Changed the command to `npm ci --omit=dev`.
- The application example included `/_ah/health` and described it as a current App Engine Flex health check endpoint. Google Cloud documents legacy health checks using `/_ah/health` as deprecated and recommends split health checks. Removed the legacy endpoint from the sample and updated the explanation to refer to the configured `/_ah/live` and `/_ah/ready` split health checks.
- The `app.yaml` sample set `memory_gb: 0.5` with `cpu: 1`. App Engine Flex requires total memory between 1.0 and 6.5 GB per CPU, and the documented requested-memory formula makes 0.6 GB the minimum requested memory for one CPU. Changed `memory_gb` to `0.6`.
- The `app.yaml` sample included an empty `network.forwarded_ports` block. The App Engine reference defines `forwarded_ports` as a list of port entries, and an empty placeholder is not useful configuration. Removed the empty network block.
- The deployment process said the image is pushed to Container Registry. Current App Engine and gcloud documentation refer to Artifact Registry for flexible environment container images. Changed this to Artifact Registry.
- The local testing section tested `/_ah/health`, which was the removed legacy endpoint. Changed the curl command to test `/_ah/ready`.

## Review Notes
The post is technically relevant and remains a useful App Engine Flex custom runtime guide. App Engine custom runtimes are still supported, but Google Cloud's custom runtime quickstart currently notes that new custom-runtime web services should consider Cloud Run first. That is a platform recommendation rather than an error in this App Engine-specific tutorial.
