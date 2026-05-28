# Validation Summary: How to Build a Multi-Region Cloud Run Service with Traffic Splitting

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Load Balancing
- Serverless Network Endpoint Groups
- Google Cloud CLI
- Artifact Registry
- Cloud Build
- Terraform
- Flask / Python
- Cloud Monitoring

## Sources Consulted
- Google Cloud Load Balancing: Set up a global external Application Load Balancer with Cloud Run, App Engine, or Cloud Run functions: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud Load Balancing: Serverless network endpoint groups overview: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud Load Balancing: Set up traffic management for global external Application Load Balancers: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-global-traffic-mgmt
- Google Cloud SDK: `gcloud compute backend-services update-backend`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend
- Google Cloud SDK: `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Artifact Registry: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Cloud Build: Build container images: https://docs.cloud.google.com/build/docs/building/build-containers
- Terraform Registry: `google_compute_url_map`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map

## Issues Found
- The post described "health-check-based failover" and claimed Cloud Run services behind a global load balancer get automatic health checking. Backend services with serverless NEG backends do not support load balancer health checks, so I changed the post to describe outlier-detection-based failover and removed the invalid health check commands.
- The post used backend `max-rate` updates as if they produced 50/30/20 weighted traffic splitting. Serverless NEG backend balancing settings do not provide percentage-based traffic splitting, so I replaced that guidance with URL map weighted backend services and clarified that each regional NEG needs its own backend service for weighted splitting.
- The example used `CLOUD_RUN_REGION`, which is not one of Cloud Run's automatically injected service environment variables. I changed the sample to use an explicit `REGION` environment variable and added a deployment command that sets it.
- The image examples used `gcr.io` while the text recommended Artifact Registry. Because Container Registry is deprecated and Artifact Registry's native image naming uses `LOCATION-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE:TAG`, I updated the build, deploy, and Cloud Build examples to use Artifact Registry-style image names.
- The load balancer commands omitted some explicit global external Application Load Balancer settings. I added `--global` to the target HTTPS proxy command and added `--load-balancing-scheme=EXTERNAL_MANAGED` and `--network-tier=PREMIUM` to the forwarding rule command.

## Review Notes
The corrected setup still assumes that the Artifact Registry Docker repository already exists and that DNS is pointed at the load balancer before a Google-managed certificate becomes active. The Terraform weighted backend example is an excerpt and assumes the referenced per-region backend services are defined elsewhere.
