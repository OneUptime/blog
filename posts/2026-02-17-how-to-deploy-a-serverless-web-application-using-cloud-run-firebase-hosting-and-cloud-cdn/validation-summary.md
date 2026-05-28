# Validation Summary: How to Deploy a Serverless Web Application Using Cloud Run Firebase Hosting

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud Run
- Firebase Hosting
- Cloud CDN
- External Application Load Balancing
- Serverless network endpoint groups
- Google Cloud CLI
- Firebase CLI
- Node.js / Express
- Docker
- Cloud Monitoring uptime checks

## Sources Consulted
- Firebase Hosting overview: https://firebase.google.com/docs/hosting
- Firebase Hosting rewrites to Cloud Run: https://firebase.google.com/docs/hosting/cloud-run
- Firebase Hosting full configuration reference: https://firebase.google.com/docs/hosting/full-config
- Firebase Hosting cache behavior: https://firebase.google.com/docs/hosting/manage-cache
- Google Cloud serverless NEG overview: https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud global external Application Load Balancer with serverless NEGs: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Cloud CDN cache modes: https://cloud.google.com/cdn/docs/using-cache-modes
- gcloud monitoring uptime create reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create

## Issues Found
- The architecture and intro implied that Cloud CDN sits in front of Firebase Hosting. Firebase Hosting serves content from its own global CDN; explicit Cloud CDN applies when using an external Application Load Balancer, such as for Cloud Run via a serverless NEG. Updated the wording and diagram to distinguish Firebase Hosting's CDN from optional Cloud CDN.
- The Cloud CDN setup used `--load-balancing-scheme=EXTERNAL` and stopped after creating a backend service. For a global external Application Load Balancer with a Cloud Run serverless NEG, Google documents `EXTERNAL_MANAGED` and requires frontend resources such as a URL map, target proxy, IP address, and forwarding rule. Updated the command sequence.
- The custom-domain command block showed `firebase hosting:channel:deploy production`, which deploys to a preview channel and does not add a custom domain. Replaced it with `firebase hosting:sites:list` as an optional site-ID check and left the Firebase Console custom-domain flow as the actual setup step.
- The uptime-check command used `--display-name`, `--monitored-resource-type`, and `--hostname`; current `gcloud monitoring uptime create` expects the display name as a positional argument plus `--resource-type`, `--resource-labels`, and a lowercase protocol value such as `https`. Updated the command.

## Review Notes
The Node.js, Express, Dockerfile, Firebase Hosting rewrite configuration, Firebase Hosting headers, and Cloud Run deployment command are technically reasonable for the tutorial. `gcr.io` image names still work in many projects, but new Google Cloud projects commonly use Artifact Registry, so a future revision could switch the example to an Artifact Registry repository.
