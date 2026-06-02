# Validation Summary: How to Build a Docker Image for a Next.js Application with Standalone Output

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Next.js
- Docker
- Node.js
- Google Cloud Run
- Google Cloud Build
- Google Artifact Registry
- Google Cloud CDN
- Google Cloud Load Balancing

## Sources Consulted
- Next.js `output: 'standalone'` documentation: https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output
- Next.js environment variables guide: https://nextjs.org/docs/pages/guides/environment-variables
- Google Cloud Run container port documentation: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud CDN with serverless backends documentation: https://docs.cloud.google.com/cdn/docs/setting-up-cdn-with-serverless
- Google Cloud serverless NEG overview: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud SDK `gcloud compute network-endpoint-groups create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create
- Google Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- npm `npm ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The `poweredByHeader: false` comment incorrectly said it was for trusting proxy headers. Updated the comment to state that it disables the `X-Powered-By` response header.
- The Dockerfile comment said `npm ci` installs only production dependencies. By default, `npm ci` installs the dependency tree from the lockfile, including dev dependencies unless omitted. Updated the comment and stage explanation to say it installs locked build dependencies.
- The static asset caching section described `gcloud run services update --session-affinity` as Cloud Run's built-in CDN integration. Session affinity is not a CDN feature. Replaced it with the documented Cloud CDN approach for Cloud Run: a serverless NEG behind an external Application Load Balancer with a CDN-enabled backend service.

## Review Notes
The Dockerfile assumes an npm project with `package-lock.json` and a `public` directory. Projects using another package manager or no `public` directory would need small Dockerfile adjustments.
