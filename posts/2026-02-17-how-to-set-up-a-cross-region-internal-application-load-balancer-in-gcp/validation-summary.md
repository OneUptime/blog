# Validation Summary: How to Set Up a Cross-Region Internal Application Load Balancer in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Load Balancing
- Cross-region internal Application Load Balancer
- Compute Engine instance group backends
- VPC networks and proxy-only subnets
- Cloud DNS geolocation routing policies
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Google Cloud documentation: Internal Application Load Balancer overview - https://docs.cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud documentation: Set up a cross-region internal Application Load Balancer with VM instance group backends - https://docs.cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-cross-reg-internal
- Google Cloud documentation: Traffic management overview for internal Application Load Balancers - https://docs.cloud.google.com/load-balancing/docs/l7-internal/traffic-management
- Google Cloud documentation: Backend services overview - https://docs.cloud.google.com/load-balancing/docs/backend-service
- Google Cloud SDK reference: `gcloud compute forwarding-rules create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK reference: `gcloud compute health-checks create http` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Google Cloud SDK reference: `gcloud compute backend-services add-backend` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK reference: `gcloud compute backend-services update-backend` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend

## Issues Found
- The post described cross-region internal Application Load Balancers as providing a single internal IP address. Google Cloud uses global forwarding rules with regional internal VIPs, and deployments can use one or more regional VIPs. Updated the wording to say "one or more regional internal IP addresses."
- The proxy-only subnet requirement was described as applying to every backend or client region. Google Cloud requires a `GLOBAL_MANAGED_PROXY` proxy-only subnet in each region where the load balancer is configured. Updated the explanation accordingly.
- The backend service command referenced a global health check but omitted `--global-health-checks`. Added the flag so the command matches the documented cross-region setup.
- The backend add commands omitted an explicit balancing mode. Added `--balancing-mode=UTILIZATION`, matching Google Cloud's documented VM instance group backend example.
- The forwarding rule commands used regional internal Application Load Balancer syntax (`--region` and `--target-http-proxy-region`). Cross-region internal Application Load Balancers require global forwarding rules with regional subnet references. Replaced those flags with `--subnet-region` and `--global`.
- The traffic distribution example claimed to configure a fixed 70/30 split. The shown backend capacity flags influence backend capacity and request distribution; they do not guarantee an exact fixed split. Updated the text and commands to describe capacity targets with `RATE` balancing mode.
- The DNS note assumed every region always has its own forwarding rule. Updated it to clarify that multiple regional VIPs are optional and can be paired with Cloud DNS geolocation routing policies.

## Review Notes
The review could not use local `gcloud --help` output because `gcloud` is not installed in the workspace. Commands and claims were checked against current official Google Cloud documentation instead.
