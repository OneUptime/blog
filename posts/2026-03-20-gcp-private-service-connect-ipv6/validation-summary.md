# Validation Summary: How to Configure GCP Private Service Connect with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Private Service Connect (PSC)
- Google Cloud VPC
- IPv6 and dual-stack subnets
- Cloud DNS
- gcloud CLI
- Terraform with the HashiCorp Google provider

## Sources Consulted
- Google Cloud: IPv6 support in Google Cloud - https://cloud.google.com/vpc/docs/ipv6-support
- Google Cloud: About accessing Google APIs through endpoints - https://cloud.google.com/vpc/docs/about-accessing-google-apis-endpoints
- Google Cloud: Access Google APIs through endpoints - https://cloud.google.com/vpc/docs/configure-private-service-connect-apis
- Google Cloud: About accessing regional endpoints through Private Service Connect endpoints - https://cloud.google.com/vpc/docs/about-accessing-regional-google-apis-endpoints
- Google Cloud: Access regional Google APIs through endpoints - https://cloud.google.com/vpc/docs/access-regional-google-apis-endpoints
- Google Cloud: About accessing published services through endpoints - https://cloud.google.com/vpc/docs/about-accessing-vpc-hosted-services-endpoints
- Google Cloud: Access published services through endpoints - https://cloud.google.com/vpc/docs/configure-private-service-connect-services
- Google Cloud: Publish services by using Private Service Connect - https://cloud.google.com/vpc/docs/configure-private-service-connect-producer
- Google Cloud: Subnets - https://cloud.google.com/vpc/docs/subnets
- Google Cloud: Reserve a static internal IP address - https://cloud.google.com/vpc/docs/reserve-static-internal-ip-address
- Google Cloud: Spanner global and regional service endpoints - https://cloud.google.com/spanner/docs/endpoints
- HashiCorp Google provider: `google_compute_forwarding_rule` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_forwarding_rule.html.markdown
- HashiCorp Google provider: `google_compute_address` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_address.html.markdown
- HashiCorp Google provider: `google_compute_subnetwork` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_subnetwork.html.markdown
- HashiCorp Google provider: `google_network_connectivity_regional_endpoint` - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/network_connectivity_regional_endpoint.html.markdown

## Issues Found
- The introduction incorrectly stated that a PSC endpoint in a dual-stack subnet receives both IPv4 and IPv6 addresses. I corrected this to reflect Google Cloud's documented behavior: endpoint IP version depends on the endpoint type, and PSC endpoints for bundles of global Google APIs are IPv4-only.
- The Google APIs section used the global Google API bundle workflow with regional forwarding-rule semantics and IPv6 assumptions that do not work. I replaced it with the supported regional Google API workflow that uses `gcloud network-connectivity regional-endpoints create`, an internal IPv6 address, and a host-specific private DNS zone with an `AAAA` record.
- The original DNS example for Google APIs created a wildcard `A` record for `*.googleapis.com`. For regional Google API endpoints, Google documents exact-hostname private DNS with `A` or `AAAA` records. I updated the DNS commands accordingly.
- The Terraform example used a subnet purpose and address purpose that were incorrect for PSC consumer endpoints, and it used `target = "all-apis"` for IPv6. I replaced it with a valid dual-stack consumer subnet, an internal IPv6 `GCE_ENDPOINT` address, `enable_ula_internal_ipv6 = true` on the VPC, and a PSC forwarding rule that targets a published service attachment URI.
- The service attachment CLI example used the wrong flags: `--forwarding-rules` on service attachment creation and `--target` on the consumer endpoint. I updated these to `--target-service` and `--target-service-attachment`, and added an explicit IPv6 consumer address reservation step.
- The test and conclusion sections implied that PSC for global Google APIs could be used directly by IPv6 clients and that protocol translation applied there. I corrected the test to validate a regional Google API over IPv6 and limited IP version translation claims to published services, which is the supported behavior.

## Review Notes
- Global Google API bundles accessed through PSC are still IPv4-only as of 2026-04-30. The corrected post now distinguishes global Google APIs from regional Google APIs and published services.
- Internal IPv6 subnets require the VPC network to have an assigned internal ULA IPv6 range. The Terraform example now includes `enable_ula_internal_ipv6 = true` to reflect that prerequisite.
- For published services, PSC supports an IPv6 consumer endpoint targeting an IPv4 service attachment, and Google documents automatic IP version translation for that combination only.
