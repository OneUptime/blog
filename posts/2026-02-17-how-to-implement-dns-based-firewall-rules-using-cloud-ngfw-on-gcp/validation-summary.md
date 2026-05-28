# Validation Summary: How to Implement DNS-Based Firewall Rules Using Cloud NGFW on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Cloud Next Generation Firewall
- Network firewall policies
- FQDN objects
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Cloud NGFW overview: https://docs.cloud.google.com/firewall/docs/about-firewalls
- Google Cloud: FQDN objects overview: https://docs.cloud.google.com/firewall/docs/fqdn-objects-overview
- Google Cloud: Firewall policy rule components: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-details
- Google Cloud: Create global network firewall policies and rules: https://docs.cloud.google.com/firewall/docs/use-network-firewall-policies
- Google Cloud SDK: `gcloud compute network-firewall-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/rules/create
- Terraform Registry: `google_compute_network_firewall_policy_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_firewall_policy_rule
- Terraform Registry: `google_compute_network_firewall_policy_association`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_firewall_policy_association

## Issues Found
- The post said to enable the Cloud NGFW Enterprise API and enabled `networksecurity.googleapis.com`. FQDN objects are a Cloud NGFW Standard feature configured through Compute Engine firewall policy resources, so I changed the prerequisite command to enable `compute.googleapis.com` only.
- The default deny egress examples omitted a destination matcher. Egress firewall policy rules should include a destination such as `0.0.0.0/0`, so I added `--dest-ip-ranges=0.0.0.0/0` to the gcloud command and `dest_ip_ranges = ["0.0.0.0/0"]` to the Terraform rule.
- The post said FQDN resolution does not depend on VM DNS settings. Cloud NGFW follows the Cloud DNS VPC name resolution order for the VPC containing the rule targets, so I corrected the explanation and the architecture diagram.
- The example used `storage.googleapis.com`, but Google documents that many Google domains can have highly variable DNS answers and recommends IP addresses or address groups for those cases. I replaced it with `github.com` in the example allowlist.
- The post claimed wildcard domains such as `*.googleapis.com` are supported. Cloud NGFW FQDN objects do not support wildcard characters, so I corrected the gotcha.
- The DNS caching guidance used an imprecise "every few minutes" threshold. Google recommends avoiding FQDN objects with DNS `A` records whose TTL is less than 90 seconds, so I updated that guidance.

## Review Notes
The gcloud command group and Terraform resource names are current. The examples cover IPv4 default deny traffic; an IPv6 environment would need equivalent IPv6 handling.
