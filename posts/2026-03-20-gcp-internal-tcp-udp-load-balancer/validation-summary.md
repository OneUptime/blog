# Validation Summary: How to Configure GCP Internal TCP/UDP Load Balancer for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Cloud Internal passthrough Network Load Balancer
- `gcloud` CLI
- Terraform Google provider
- VPC networking
- TCP/UDP load balancing

## Sources Consulted
- Google Cloud: Internal passthrough Network Load Balancer overview - https://cloud.google.com/load-balancing/docs/internal
- Google Cloud: Set up an internal passthrough Network Load Balancer - https://cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud: Multiple forwarding rules with the same IP address - https://cloud.google.com/load-balancing/docs/internal/multiple-forwarding-rules-same-ip
- Google Cloud SDK: `gcloud compute forwarding-rules create` - https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: `gcloud compute backend-services create` - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK: `gcloud compute backend-services add-backend` - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK: `gcloud compute backend-services get-health` - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- Google Cloud SDK: `gcloud compute health-checks create tcp` - https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/tcp
- Google Cloud SDK: `gcloud compute addresses create` - https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Terraform Google provider: `google_compute_forwarding_rule` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_forwarding_rule.html.markdown
- Terraform Google provider: `google_compute_region_backend_service` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_region_backend_service.html.markdown
- Terraform Google provider: `google_compute_address` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_address.html.markdown

## Issues Found
- The post instructed readers to configure a named port on the unmanaged instance group. Internal passthrough Network Load Balancers do not use named ports, so that command was removed.
- The health check was created without a region even though the backend service later referenced it with `--health-checks-region us-east1`. The health check command was updated to create a regional health check in `us-east1`, and the interval was made explicit as `10s`.
- The post omitted the firewall rule needed to let Google Cloud health check probes reach the backend VMs. A minimal ingress firewall rule for the documented health check source ranges was added before the health check command.
- The forwarding rule used `--ip-address`, but the current `gcloud compute forwarding-rules create` command uses `--address`. The command was corrected.
- The all-ports example used `--all-ports`, but the current `gcloud` syntax for this command is `--ports ALL`. The example was corrected.
- The all-ports section implied the same load balancer could cover TCP and UDP interchangeably. The wording was corrected to keep the example TCP-only and to note that UDP requires a separate UDP backend service and forwarding rule.
- The Terraform example used `all_ports = true`, which did not match the earlier port-8080 walkthrough. It was updated to `ports = ["8080"]` and to use the reserved address value directly.

## Review Notes
- The post is now technically correct for a TCP-based internal passthrough Network Load Balancer example on IPv4.
- If readers want one shared IP for multiple forwarding rules, Google Cloud requires the reserved internal address to use `SHARED_LOADBALANCER_VIP`, and same-protocol rules on the same IP cannot have overlapping ports.
