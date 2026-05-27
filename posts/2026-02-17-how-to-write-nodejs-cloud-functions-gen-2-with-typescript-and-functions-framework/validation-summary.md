# Validation Summary: How to Write Node.js Cloud Functions Gen 2 with TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run functions / Cloud Functions Gen 2
- Google Cloud Functions Framework for Node.js
- TypeScript
- Node.js
- Pub/Sub CloudEvents
- Cloud Storage CloudEvents
- gcloud CLI
- Jest and ts-jest

## Sources Consulted
- Google Cloud Run functions: Write functions: https://docs.cloud.google.com/run/docs/write-functions
- Google Cloud Run functions: Local functions development: https://docs.cloud.google.com/run/docs/local-dev-functions
- Google Cloud Run functions: Deploy a function: https://cloud.google.com/functions/docs/deploy
- Google Cloud Run functions: Runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Run functions: Node.js runtime: https://cloud.google.com/functions/docs/concepts/nodejs-runtime
- Google Cloud Run: Specify dependencies in Node.js: https://cloud.google.com/run/docs/runtimes/nodejs-dependencies
- Google Cloud SDK: gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Functions Framework for Node.js repository: https://github.com/GoogleCloudPlatform/functions-framework-nodejs
- npm package metadata for @google-cloud/functions-framework: https://www.npmjs.com/package/@google-cloud/functions-framework

## Issues Found
- The deployment examples used `--runtime=nodejs20`, but Node.js 20 is deprecated as of 2026-04-30 and scheduled for decommission on 2026-10-30. Updated the package scripts and deployment commands to use `nodejs22`.
- The Pub/Sub and Cloud Storage handlers were shown in separate files while `package.json` pointed `"main"` to `dist/index.js`. This would make `--entry-point=processOrder` and `--entry-point=processUpload` unavailable unless they were exported from `src/index.ts`. Added the required re-export snippet.
- The package used a `build` script while the `.gcloudignore` excluded `src/` and `tsconfig.json`. Google Cloud's Node.js runtime runs `npm run build` during deployment when a build script is present, so the remote build would fail after those files were excluded. Added an empty `gcp-build` script and a short explanation so the local-build/deploy-`dist` workflow works.
- The test section used Jest and TypeScript tests, but the setup and `package.json` did not include Jest, ts-jest, Jest types, or Express request/response types. Added the missing dev dependencies and inline Jest configuration.

## Review Notes
The Functions Framework and gcloud flags used in the post are current and match official documentation. `@google-cloud/functions-framework` has newer npm releases than the version shown, but the documented `^3.3.0` range remains consistent with Google's examples that use `^3.0.0`.
