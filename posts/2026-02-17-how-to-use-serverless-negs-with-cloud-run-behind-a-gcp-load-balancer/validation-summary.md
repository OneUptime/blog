# Validation Summary: Use Serverless Network Endpoint Groups with Cloud Run Behind a GCP Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Cloud Load Balancing
- Serverless network endpoint groups
- Cloud CDN
- Cloud Armor
- Google Cloud CLI
- Flask
- Mermaid

## Sources Consulted
- Google Cloud Load Balancing: Set up a global external Application Load Balancer with Cloud Run, App Engine, or Cloud Run functions: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud Load Balancing: Serverless network endpoint groups overview: https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- Google Cloud SDK: gcloud compute network-endpoint-groups create: https://cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create
- Google Cloud SDK: gcloud compute url-maps add-path-matcher: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/add-path-matcher
- Google Cloud Run: Restrict network ingress for Cloud Run: https://cloud.google.com/run/docs/securing/ingress
- Google Cloud Armor: Configure rate limiting: https://cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud Run: Deploying container images to Cloud Run: https://cloud.google.com/run/docs/deploying

## Issues Found
- The sample Cloud Run image used the older `gcr.io/cloudrun/hello` reference. Updated it to the current documented sample image, `us-docker.pkg.dev/cloudrun/container/hello`.
- The static IP and HTTPS forwarding rule examples omitted Premium Network Service Tier settings required for the documented global external Application Load Balancer flow, especially for multi-region serverless NEG routing. Added `--network-tier=PREMIUM` to the address and forwarding rule commands.
- The HTTPS forwarding rule omitted `--load-balancing-scheme=EXTERNAL_MANAGED`, which is required for the global external Application Load Balancer configuration shown in the post. Added the flag.
- The health-check note implied Cloud Run health is automatically evaluated by the load balancer. Reworded it to the documented behavior: backend services with serverless NEG backends do not support health checks, so no load-balancer health check is configured.
- The path-based routing example added a path matcher but did not associate it with a host rule. Added `--new-hosts=app.example.com` so the path matcher is referenced by a host rule.
- The Cloud Armor rate-limiting rule lacked a match condition. Added `--src-ip-ranges="*"` so the rule applies to all source IPs.
- The IAM section incorrectly said the load balancer uses IAM to authenticate to Cloud Run through the Compute Engine default service account. Replaced this with the documented ingress restriction approach, `--ingress=internal-and-cloud-load-balancing`, for blocking direct access to the default Cloud Run URL while allowing load-balancer traffic.

## Review Notes
- `gcloud` was not installed in the local workspace, so CLI syntax was verified against official Google Cloud SDK documentation instead of local `--help` output.
- Multi-region serverless NEG routing is supported for Cloud Run and Cloud Run functions, and requires Premium Network Service Tier for the global external Application Load Balancer.
