# Validation Summary: How to Set Up Firebase Hosting with Cloud Run for Dynamic Server-Side Content

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Firebase Hosting
- Cloud Run
- Google Cloud CLI and Cloud Build
- Firebase CLI
- Node.js
- Express
- Docker
- HTTP caching with Cache-Control

## Sources Consulted
- Firebase Hosting Cloud Run rewrites: https://firebase.google.com/docs/hosting/cloud-run
- Firebase Hosting configuration, rewrites, headers, and glob behavior: https://firebase.google.com/docs/hosting/full-config
- Firebase Hosting cache behavior for dynamic content: https://firebase.google.com/docs/hosting/manage-cache
- Firebase CLI Hosting commands and preview channels: https://firebase.google.com/docs/cli
- Firebase Hosting custom domains: https://firebase.google.com/docs/hosting/custom-domain
- Cloud Run container runtime contract: https://cloud.google.com/run/docs/container-contract
- Cloud Run deploy command reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run service log command reference: https://cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Node.js EOL information: https://nodejs.org/en/about/eol
- npm ci command requirements and omit option: https://docs.npmjs.com/cli/v11/commands/npm-ci
- Docker Node official image tags: https://hub.docker.com/_/node/

## Issues Found
- The Dockerfile used `FROM node:20-slim`, but Node.js 20 is end-of-life as of 2026. Updated the image to `node:24-slim`, which is the current LTS line.
- The Dockerfile copied `package-lock.json` and ran `npm ci`, but the tutorial only created `package.json`. Since `npm ci` requires an existing lockfile, changed the Dockerfile to copy `package*.json` and run `npm install --omit=dev`.
- The server-side rendered route inserted `req.params.page` directly into HTML. Escaped the route parameter before rendering it to avoid an unsafe SSR example.
- The custom-domain section used `firebase hosting:channel:deploy live`, which is for deploying Hosting content/config to a preview channel and is not how Firebase Hosting custom domains are added. Replaced it with `firebase deploy --only hosting` followed by the existing Firebase Console custom-domain step.
- The custom-domain instructions specifically said to add A and AAAA records. Firebase's setup wizard can request different record types depending on the domain, so the wording now tells readers to add the DNS records shown by the wizard.
- The cost-monitoring best practice said every dynamic-route request invokes Cloud Run. Because Firebase Hosting can serve cached dynamic responses from the CDN when appropriate cache headers are set, changed this to "Every uncached request."

## Review Notes
The Firebase Hosting rewrite configuration, `run.serviceId` and `region` fields, Cloud Run deployment flags, preview-channel command, Cloud Run log command, and Cache-Control explanation were consistent with current official documentation. The post could optionally mention `pinTag` for keeping Hosting versions and Cloud Run revisions aligned, but the current configuration is valid without it.
