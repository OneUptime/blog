# Validation Summary: How to Build a Serverless PDF Generation Service Using Cloud Run and Puppeteer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Puppeteer
- Node.js
- Express
- Handlebars
- Google Cloud Storage
- Cloud Tasks
- Docker
- gcloud CLI

## Sources Consulted
- Puppeteer Docker guide: https://pptr.dev/guides/docker
- Puppeteer installation guide: https://pptr.dev/guides/installation
- Puppeteer LaunchOptions API: https://pptr.dev/api/puppeteer.launchoptions
- Puppeteer PDFOptions API: https://pptr.dev/api/puppeteer.pdfoptions
- Google Cloud Run `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run developer authentication guide: https://cloud.google.com/run/docs/authenticating/developers
- Google Cloud Run with Cloud Tasks guide: https://cloud.google.com/run/docs/triggering/using-tasks
- Cloud Storage signed URL V4 sample: https://cloud.google.com/storage/docs/samples/storage-generate-signed-url-v4
- Cloud Storage Node.js FileMetadata reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/filemetadata
- npm install documentation: https://docs.npmjs.com/cli-documentation/install

## Issues Found
- The Puppeteer launch example used `headless: 'new'`, which is outdated in current Puppeteer docs. Changed it to `headless: true`, which launches current headless mode.
- The Dockerfile set Puppeteer download/executable environment variables after `npm ci` and pointed `PUPPETEER_EXECUTABLE_PATH` at `/usr/bin/google-chrome-stable`, which is not present in the official Puppeteer image. Moved the skip-download setting before dependency installation, updated `npm ci --production` to `npm ci --omit=dev`, and removed the incorrect executable path.
- The private Cloud Run service was invoked in the curl example without an identity token. Added the `Authorization: Bearer $(gcloud auth print-identity-token)` header.
- The Cloud Tasks batch example targeted a private Cloud Run service without an OIDC token. Added a service account variable, target URL variable, and `oidc_token` configuration with the service URL as audience.
- The template name was interpolated into a filesystem path without validation. Added a simple template-name regex and type check to prevent path traversal through the `template` field.
- The Puppeteer `setContent` comment claimed it configured a base URL for relative asset paths, but no base URL was actually supplied. Reworded the comment to match the code behavior.
- The Puppeteer page was only closed on the success path. Added a `finally` block so pages are closed after failures as well.

## Review Notes
- The snippets parse as JavaScript and Python after the fixes. I did not deploy the Cloud Run service or run an end-to-end PDF generation request.
- The Dockerfile still uses `ghcr.io/puppeteer/puppeteer:latest`, which is valid but not reproducible. Pinning a Puppeteer image tag would make production builds more deterministic.
- Production deployments should explicitly grant the Cloud Run runtime service account the needed Cloud Storage permissions, and the Cloud Tasks service account the Cloud Run Invoker role.
