# Validation Summary: How to Configure a Regional Internal Application Load Balancer in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Load Balancing
- Regional internal Application Load Balancer
- Compute Engine instance groups
- VPC networks and proxy-only subnets
- Google Cloud firewall rules
- Google Cloud CLI

## Sources Consulted
- Google Cloud documentation: Set up a regional internal Application Load Balancer with VM instance group backends: https://docs.cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-internal
- Google Cloud documentation: Internal Application Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud documentation: Internal Application Load Balancers and connected networks: https://docs.cloud.google.com/load-balancing/docs/l7-internal/internal-https-lb-and-other-networks
- Google Cloud documentation: Firewall rules for Cloud Load Balancing: https://docs.cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud documentation: Use health checks: https://docs.cloud.google.com/load-balancing/docs/health-checks
- Google Cloud CLI reference: gcloud compute forwarding-rules create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create

## Issues Found
- The target HTTP proxy command referenced a regional URL map but did not specify `--url-map-region`. Added `--url-map-region=us-central1` to match Google Cloud's regional internal Application Load Balancer setup guidance.
- The backend service flow used port `8080` for health checks and firewall rules but did not ensure the instance group had a named serving port for backend traffic. Added `gcloud compute instance-groups set-named-ports my-internal-group --named-ports=http:8080 --zone=us-central1-a` before attaching the backend.
- The backend attachment command omitted the balancing mode shown in Google's VM instance group backend setup. Added `--balancing-mode=UTILIZATION`.
- The post described client reachability too broadly for a regional internal Application Load Balancer. Updated the wording to note that same-region access applies by default and global access is needed for clients in other regions.

## Review Notes
The remaining commands and explanations match current Google Cloud documentation for a regional internal Application Load Balancer using VM instance group backends. The local environment did not have the `gcloud` CLI installed, so command verification was performed against official Google Cloud documentation rather than local `gcloud --help` output.
