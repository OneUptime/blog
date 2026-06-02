# Validation Summary: Fix Internal TCP/UDP Load Balancer Health Check Failing Despite Healthy Backends

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud internal passthrough Network Load Balancer
- Google Cloud health checks
- Google Cloud VPC firewall rules
- Google Cloud CLI
- Compute Engine VM networking

## Sources Consulted
- Google Cloud Load Balancing health check concepts: https://docs.cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud health checks guide: https://docs.cloud.google.com/load-balancing/docs/health-checks
- Internal passthrough Network Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/internal
- Set up an internal passthrough Network Load Balancer with VM instance group backends: https://docs.cloud.google.com/load-balancing/docs/internal/setting-up-internal
- gcloud compute backend-services get-health reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- gcloud compute health-checks describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/health-checks/describe
- gcloud compute firewall-rules create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- gcloud compute firewall-rules list reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- gcloud compute instances describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/describe

## Issues Found
- The post incorrectly implied that backend VMs for an internal passthrough Network Load Balancer generally need IP forwarding enabled to accept traffic whose destination is the load balancer IP. Google Cloud documentation states that VMs created from Google Cloud images use the guest environment to install a local route for the forwarding rule IP. I changed Step 6 to check the local route and guest environment instead of recommending `canIpForward`.
- The post described the probes as arriving on the VM's network interface without making clear that, for internal passthrough Network Load Balancers, the destination IP is the forwarding rule IP. I updated the wording to match Google Cloud's health check destination behavior.
- The opening explanation contrasted internal load balancer health checks with external load balancers too broadly. I narrowed the claim to internal passthrough Network Load Balancers and IPv4 probe ranges.

## Review Notes
The local environment did not have `gcloud` installed, so CLI command validation was performed against official Google Cloud SDK reference pages instead of local `--help` output.
