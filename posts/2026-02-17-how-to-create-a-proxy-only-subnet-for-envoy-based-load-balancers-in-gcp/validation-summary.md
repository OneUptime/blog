# Validation Summary: How to Create a Proxy-Only Subnet for Envoy-Based Load Balancers in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Proxy-only subnets
- Envoy-based load balancers
- Google Cloud CLI
- VPC firewall rules
- Terraform Google provider

## Sources Consulted
- Google Cloud documentation: Proxy-only subnets for Envoy-based load balancers - https://docs.cloud.google.com/load-balancing/docs/proxy-only-subnets
- Google Cloud SDK reference: gcloud compute networks subnets create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Google Cloud documentation: Firewall rules for Cloud Load Balancing - https://docs.cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud documentation: Use health checks - https://docs.cloud.google.com/load-balancing/docs/health-checks
- Terraform Registry: google_compute_subnetwork - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork

## Issues Found
- The supported load balancer list omitted regional internal, regional external, and cross-region internal proxy Network Load Balancers, which also require proxy-only subnets. Added those entries and clarified that global external and classic proxy Network Load Balancers do not need proxy-only subnets.
- The post stated that all Envoy-based load balancers in the same region share one subnet. Google Cloud allows one active proxy-only subnet per purpose, region, and VPC network, so the wording was narrowed to the matching purpose.
- The resizing guidance said the subnet must be deleted and recreated. Google Cloud documents a replacement workflow using a backup subnet, firewall updates, promotion to active, and draining, so the wording was corrected to say proxy-only subnets are replaced rather than expanded in place.
- The active/backup migration commands explicitly updated the old active subnet to BACKUP. Google Cloud documentation says you promote the backup subnet to ACTIVE and Google Cloud automatically changes the previous active subnet to BACKUP; you cannot explicitly set a proxy-only subnet role to BACKUP by update. The example now updates the firewall rule for both ranges and promotes the new subnet with `--drain-timeout`.
- The firewall explanation incorrectly tied backend health status to health checks coming from the proxy-only subnet. The wording was corrected so the proxy-only subnet firewall rule is described as required for proxied backend traffic, while the separate Google health check ranges remain documented separately.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI validation was performed against the official current gcloud reference instead of local `gcloud --help` output.
