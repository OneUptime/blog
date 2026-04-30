# Validation Summary: How to Import GCP VPC Networks into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Google provider / Terraform-compatible HCL
- Google Cloud VPC networks
- Google Cloud subnetworks
- Google Cloud VPC firewall rules
- Google Cloud Router and Cloud NAT
- `gcloud` CLI

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- Google Cloud SDK reference for `gcloud compute networks describe`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/describe
- Google Cloud SDK reference for `gcloud compute networks subnets list`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/list
- Google Cloud firewall documentation, including the documented `gcloud compute firewall-rules list --filter network=NETWORK` example: https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud VPC networks documentation: https://cloud.google.com/vpc/docs/vpc
- Google Cloud subnets documentation: https://cloud.google.com/vpc/docs/subnets
- Google provider docs for `google_compute_network`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Google provider docs for `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Google provider docs for `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Google provider docs for `google_compute_router`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router
- Google provider docs for `google_compute_router_nat`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat

## Issues Found
- The firewall inventory command used `--filter="network:$NETWORK"`. I changed it to `--filter="network=$NETWORK"` to match the documented Google Cloud firewall-rule listing syntax.
- The firewall example used `source_ranges = ["10.10.0.0/8"]`, which is not a valid `/8` network boundary. I changed it to `10.0.0.0/8` so the CIDR is valid.
- The import comments and conclusion implied a narrower set of import ID formats than the provider actually accepts. I clarified that the examples use accepted shorthand IDs and that full `projects/...` resource-path IDs are also supported.
- The conclusion said resources “reference each other,” which overstated the dependency relationship. I clarified the wording to describe incremental import order more precisely.

## Review Notes
- OpenTofu 1.11 documentation still marks configuration-driven `import` blocks as experimental. The syntax used in the post is valid, but readers should verify behavior against the OpenTofu version they run.
