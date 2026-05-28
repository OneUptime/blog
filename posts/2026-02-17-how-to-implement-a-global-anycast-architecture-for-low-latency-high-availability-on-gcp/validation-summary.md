# Validation Summary: How to Build a Global Anycast Architecture for Low-Latency High Availability

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Load Balancing
- Global external IP addresses and anycast
- Compute Engine managed instance groups
- Compute Engine health checks
- Cloud CDN
- Google Cloud Armor
- Network Service Tiers
- Cloud Monitoring uptime checks
- Python Flask middleware

## Sources Consulted
- Google Cloud Load Balancing overview: https://docs.cloud.google.com/load-balancing/docs/load-balancing-overview
- Google Cloud Application Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/application-load-balancer
- Google Cloud load balancer selection and Network Service Tiers: https://docs.cloud.google.com/load-balancing/docs/choosing-load-balancer
- Google Cloud external Application Load Balancer firewall requirements: https://cloud.google.com/load-balancing/docs/https
- Set up a global external Application Load Balancer with VM instance group backends: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- gcloud compute addresses create reference: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- gcloud compute instance-templates create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- gcloud compute instance-groups managed set-named-ports reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-named-ports
- gcloud compute backend-services create reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- gcloud compute ssl-certificates create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- gcloud compute forwarding-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- gcloud compute security-policies rules create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- gcloud monitoring uptime create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud Network Service Tiers quickstart: https://docs.cloud.google.com/network-tiers/docs/set-network-tier

## Issues Found
- Corrected the Google Front End location claim from "over 200 locations worldwide" to "more than 80 distinct locations worldwide," matching current Cloud Load Balancing documentation.
- Added named port configuration for each managed instance group. The backend service uses `--port-name=http`, so each instance group needs a matching `http:8080` named port.
- Added a firewall rule allowing Google health check and GFE proxy ranges to reach backend VMs on port 8080. Without this, health checks and proxied load-balanced traffic to instance group backends can fail.
- Changed the instance template network tag from `http-server` to `allow-health-check` so the added firewall rule applies to the backend instances.
- Fixed the Cloud Armor rate-based-ban rule by adding a required match expression and changing `--enforce-on-key=IP` to the documented lowercase `--enforce-on-key=ip`.
- Fixed the Cloud Monitoring uptime check command. The original used unsupported flags (`--display-name`, `--uri`, `--http-method`), an invalid period value for the current CLI, and uppercase region names. The corrected command uses the display name positional argument, `--resource-type`, `--resource-labels`, `--protocol`, `--path`, `--request-method`, `--period=1`, and documented region identifiers.
- Clarified backend routing wording to match Google Cloud documentation: traffic is routed to the closest healthy backend that has capacity, not necessarily the nearest backend unconditionally.

## Review Notes
The examples remain intentionally abbreviated and assume `startup.sh` serves HTTP on port 8080 and that placeholders such as `PROJECT_ID` and `REGION_CODE` are replaced before use. The installed workspace does not include `gcloud`, so command validation was performed against the official Google Cloud CLI reference rather than local `--help` output.
