# Validation Summary: How to Build an Express.js API and Deploy It to Cloud Run with Automatic HTTPS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Express.js
- Node.js
- Docker
- Google Cloud Run
- Google Cloud Build
- Artifact Registry
- Cloud Run custom domain mapping
- Google Cloud Load Balancing
- Google-managed SSL certificates

## Sources Consulted
- Google Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud Run container configuration documentation: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Run deploy CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud global external Application Load Balancer with Cloud Run documentation: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud Build submit documentation: https://docs.cloud.google.com/build/docs/running-builds/submit-build-via-cli-api
- Google Artifact Registry transition guidance for Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Express routing documentation: https://expressjs.com/en/guide/routing.html
- Node.js release schedule: https://github.com/nodejs/release
- Docker Official Node image listing: https://hub.docker.com/_/node

## Issues Found
- The post used Node.js 20 examples even though Node.js 20 reached end-of-life on April 30, 2026. Updated the `engines` field, Dockerfile base images, and Cloud Build test image to Node.js 22.
- The `package.json` did not define a `test` script, but the Cloud Build pipeline ran `npm test`. Added a syntax-check test script for the files shown in the tutorial.
- The Dockerfile used `npm ci --only=production`. Updated it to the current `npm ci --omit=dev` form and added a note that `package-lock.json` must exist before building.
- The dependency versions were outdated for a 2026 tutorial. Updated Express, Helmet, CORS, Morgan, and Nodemon versions to current published versions.
- The production logging comment claimed JSON logging, but the code used Morgan's `combined` format. Corrected the comment to match the actual log format.
- The deployment and CI/CD examples used `gcr.io`/Container Registry-style image paths. Updated examples to use Artifact Registry image paths and added the repository creation command.
- The Cloud Run custom domain section used `gcloud run domain-mappings` commands, but current Google documentation shows `gcloud beta run domain-mappings` for Cloud Run domain mappings. Updated the commands.
- The post described Cloud Run domain mapping as a basic production path. Current Google documentation marks Cloud Run domain mappings as Preview and not recommended for production services. Added that caveat and directed production custom domains to the load balancer option.
- The DNS explanation implied a single typical CNAME record. Updated the text to instruct readers to add all returned `resourceRecords`, with CNAME/A/AAAA examples as possible outputs.
- The load balancer example omitted a reserved global static IP and required forwarding rule options for a global external Application Load Balancer. Added the IP reservation command and `--load-balancing-scheme`, `--network-tier`, and `--address` flags.

## Review Notes
The Express route examples are syntactically valid and use standard Express middleware/router APIs. The sample API still uses in-memory placeholder data, which is appropriate for a tutorial scaffold but would need persistence, input validation, and real tests before production use.
