# Validation Summary: How to Configure IPv6 on Google Compute Engine VMs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud VPC dual-stack and IPv6 subnets
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Public NAT / NAT64
- Debian 12 images

## Sources Consulted
- Compute Engine: Create an instance that uses IPv6 addresses — https://cloud.google.com/compute/docs/instances/create-ipv6-instance
- Compute Engine: Configure IPv6 addresses for instances and instance templates — https://cloud.google.com/compute/docs/ip-addresses/configure-ipv6-address
- Google Cloud SDK reference: `gcloud compute instances create` — https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: `gcloud compute instances network-interfaces update` — https://cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/update
- Google Cloud SDK reference: `gcloud compute instance-templates create` — https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Compute Engine: IP addresses — https://cloud.google.com/compute/docs/ip-addresses
- Compute Engine: View the network configuration for an instance — https://cloud.google.com/compute/docs/instances/view-network-properties
- Cloud NAT: Public NAT — https://cloud.google.com/nat/docs/public-nat
- VPC: IPv6 support in Google Cloud — https://cloud.google.com/vpc/docs/ipv6-support
- Terraform Google provider: `google_compute_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Terraform Google provider: `google_compute_instance_template` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance_template.html.markdown
- Terraform Google provider: `google_compute_subnetwork` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_subnetwork.html.markdown
- Compute Engine: Operating system details — https://cloud.google.com/compute/docs/images/os-details

## Issues Found
- The introduction said VMs automatically receive IPv6 once placed in a dual-stack subnet. I corrected this to explain that the VM network interface must also be configured with an IPv6-capable stack type, and that a single NIC gets either internal or external IPv6, not both.
- The `gcloud compute instances create` examples mixed `--subnet` and `--network-interface`, which the CLI documents as mutually exclusive. I rewrote them to use the documented single-NIC syntax.
- The static IPv6 example used `ipv6-address=.../128`. I replaced it with the documented `--external-ipv6-address` and `--external-ipv6-prefix-length=96` flags because Compute Engine assigns external IPv6 as a `/96` range.
- The existing-instance update section included a stop/start sequence that is not part of the documented stack-type update flow. I removed the restart steps and kept the documented `network-interfaces update` command.
- The Terraform example used `ipv6_network_tier` directly under `google_compute_instance.network_interface` and output `network_interface[0].ipv6_address` for an external IPv6 case. I replaced this with the provider-documented `ipv6_access_config` block and output `ipv6_access_config[0].external_ipv6`.
- The verification section assumed public IPv6 internet reachability and tools that are not guaranteed on a stock Debian image (`curl`, `dig`). I updated it to use `ping -6` for external IPv6 connectivity and `getent ahostsv6` for AAAA resolution, and clarified the internal-only case.
- The external-vs-internal IPv6 section described internal IPv6 internet behavior too broadly. I corrected it to state that internal IPv6 addresses are not internet-routable and simplified the `gcloud compute instances describe` formatting to documented fields.
- The instance template example also mixed `--subnet` and `--network-interface`. I replaced it with the documented template syntax.

## Review Notes
- The examples assume `subnet-web` already has an IPv6 range and an IPv6 access type that matches the example being shown; the external-address examples specifically require an `EXTERNAL` IPv6 subnet.
- The post uses Debian 12 images, which Google Cloud still lists as the `debian-12` image family in the `debian-cloud` project as of April 30, 2026.
- Public NAT supports NAT64 for IPv6-to-IPv4 internet access, but it does not make internal ULA IPv6 addresses directly reachable on the public IPv6 internet.
