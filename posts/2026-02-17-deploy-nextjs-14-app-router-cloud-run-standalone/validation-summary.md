# Validation Summary: How to Deploy a Next.js 14 App Router Application to Cloud Run

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Next.js 14 App Router
- Next.js standalone output mode
- Docker multi-stage builds
- Google Cloud Run
- Google Cloud Build
- Artifact Registry
- gcloud CLI

## Sources Consulted
- Next.js 14 output configuration documentation: https://nextjs.org/docs/14/app/api-reference/next-config-js/output
- Next.js 14 environment variables documentation: https://nextjs.org/docs/14/app/building-your-application/configuring/environment-variables
- Cloud Run container runtime contract: https://cloud.google.com/run/docs/container-contract
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud run services update reference: https://cloud.google.com/sdk/gcloud/reference/run/services/update
- Cloud Run CPU configuration documentation: https://cloud.google.com/run/docs/configuring/services/cpu
- gcloud builds submit reference: https://cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Registry Docker image quickstart: https://cloud.google.com/artifact-registry/docs/docker/store-docker-container-images
- Cloud Build build config file schema: https://cloud.google.com/build/docs/build-config-file-schema

## Issues Found
- The Dockerfile installed only production dependencies before running `npm run build`. This can break typical Next.js builds because build-time tooling is often in `devDependencies`. Changed `RUN npm ci --only=production` to `RUN npm ci`; the standalone output still keeps the runtime image minimal.
- The main Dockerfile discussed Cloud Run's `HOSTNAME` requirement but did not set `HOSTNAME` in the runner stage. Added `ENV HOSTNAME=0.0.0.0` next to `PORT=8080`.
- The Cloud Run deploy examples used `--platform managed`, which is not shown in the current `gcloud run deploy` reference and is no longer needed for current managed Cloud Run deploys. Removed the flag.
- The Cloud Run tuning command used `--startup-cpu-boost`, but the official gcloud flag is `--cpu-boost`. Removed the invalid duplicate flag and left `--cpu-boost`.
- The environment-variable explanation described `NEXT_PUBLIC_` variables as simply "build-time variables" and runtime variables as only server-side. Updated the wording to match Next.js documentation: `NEXT_PUBLIC_` values are public and inlined at build time, while server variables can be read at runtime when App Router rendering is dynamic.

## Review Notes
- The standalone output description, copying of `public/` and `.next/static/`, and `PORT`/`HOSTNAME` behavior match the Next.js standalone documentation.
- Cloud Run's requirement to listen on `0.0.0.0` and the injected `PORT` environment variable match the Cloud Run container runtime contract.
- The `.dockerignore` example is suitable for a basic app, but projects that import Markdown or other documentation content during `next build` should avoid excluding those files from the build context.
