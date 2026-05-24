# Validation Summary: How to Create GCP Shared VPC with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- Shared VPC
- Google Compute Engine networking (VPC, subnets, firewall rules)
- Cloud NAT and Cloud Router
- Identity-Aware Proxy (IAP)
- Google Kubernetes Engine (GKE) Shared VPC requirements
- IAM (subnet-level and project-level bindings)

## Sources Consulted
- Terraform Google provider docs:
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_host_project
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_service_project
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork_iam
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router
  - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Google Cloud Shared VPC docs: https://cloud.google.com/vpc/docs/shared-vpc
- GKE on Shared VPC service-agent requirements: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-shared-vpc
- IAP TCP forwarding source range: https://cloud.google.com/iap/docs/using-tcp-forwarding (35.235.240.0/20)
- Google load balancer health check ranges: https://cloud.google.com/load-balancing/docs/health-check-concepts (35.191.0.0/16, 130.211.0.0/22)
- Private Google Access IP ranges: https://cloud.google.com/vpc/docs/configure-private-google-access (private.googleapis.com 199.36.153.8/30, restricted.googleapis.com 199.36.153.4/30)
- VPC flow log aggregation interval values: https://cloud.google.com/vpc/docs/flow-logs

## Issues Found
No technical issues found.

## Review Notes
- The `priority = 65534` on the default-deny egress rule correctly overrides GCP's implied default-allow-egress (priority 65535).
- CIDR allocations across the three subnets and their secondary ranges do not overlap.
- The egress firewall rules correctly use `destination_ranges` (not `source_ranges`), as required for EGRESS direction.
- The two Google APIs CIDRs (`199.36.153.8/30` and `199.36.153.4/30`) are the Private Google Access VIPs for `private.googleapis.com` and `restricted.googleapis.com` respectively. The "Allow egress to Google APIs" rule is therefore only useful when Private Google Access (or VPC-SC restricted access) is configured with DNS overrides; egress to Google's public API endpoints would not be covered by this rule. This is not incorrect for a Shared VPC / private-networking context, but readers should be aware of the distinction.
- `roles/container.hostServiceAgentUser` and the `service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com` agent identity remain the current GKE-on-Shared-VPC requirements as of 2026.
