# Validation Summary: How to Change GCP Subnets from IPv4-Only to Dual-Stack

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC subnets
- Google Compute Engine VM networking
- IPv6 dual-stack networking
- `gcloud` CLI
- Terraform `google_compute_subnetwork`

## Sources Consulted
- Google Cloud VPC subnets documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud CLI reference for `gcloud compute networks subnets update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud CLI reference for `gcloud compute networks update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/update
- Compute Engine IPv6 configuration documentation: https://cloud.google.com/compute/docs/ip-addresses/configure-ipv6-address
- Compute Engine network properties documentation: https://cloud.google.com/compute/docs/instances/view-network-properties
- Google Cloud CLI reference for `gcloud compute instances network-interfaces update`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/update
- Terraform Registry for `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork

## Issues Found
- The introduction said VMs could be "updated or restarted" to receive IPv6 after subnet conversion. I changed this to require updating the VM network interface stack type to `IPV4_IPV6`, which is the documented action for enabling IPv6 on an existing instance.
- The post omitted two prerequisites: dual-stack subnets require a custom-mode VPC, and `INTERNAL` IPv6 requires ULA internal IPv6 to already be enabled on the VPC. I added both prerequisites to the introduction and Terraform note.
- The VM update section incorrectly said the network-interface update "stops and starts" the VM, and its second method only stopped and started the VM without updating the NIC stack type. I corrected the method descriptions and made the stop/start example include the required `network-interfaces update` step.
- The verification command used a `--format` expression that did not match documented `gcloud` field formatting for this use case. I replaced it with direct field lookups.
- The post mixed internal and external IPv6 flows: the script and Terraform example used `INTERNAL`, while the rest of the post verified external connectivity and used `--ipv6-network-tier=PREMIUM`. I standardized the runnable examples on `EXTERNAL` IPv6 and added notes showing the correct field to use for `INTERNAL` IPv6.
- The verification examples read `networkInterfaces[0].ipv6Address`, which is correct for internal IPv6 but not for external IPv6. I changed the external-flow examples to use `networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6`.
- The Linux test command used `ping6`. I changed it to `ping -6`, which is the more portable form across modern Linux distributions.

## Review Notes
- The post is now technically accurate for a dual-stack migration centered on external IPv6.
- If the author later wants a dedicated internal IPv6 variant, it should show the VPC-level ULA enablement step explicitly and avoid external-only verification like public IPv6 pings or `--ipv6-network-tier=PREMIUM`.
- Validated against current official documentation available on April 30, 2026.
