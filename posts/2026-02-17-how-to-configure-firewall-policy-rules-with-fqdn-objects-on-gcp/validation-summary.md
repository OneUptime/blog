# Validation Summary: How to Configure Firewall Policy Rules with FQDN Objects on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Cloud Next Generation Firewall
- Global and regional network firewall policies
- FQDN objects
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Fully qualified domain name objects overview: https://docs.cloud.google.com/firewall/docs/fqdn-objects-overview
- Google Cloud: Firewall policy rule components: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-details
- Google Cloud CLI: `gcloud compute network-firewall-policies rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/rules/create
- Google Cloud CLI: `gcloud compute network-firewall-policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/create
- Google Cloud CLI: `gcloud compute network-firewall-policies associations create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/associations/create
- Google Cloud CLI: `gcloud compute instances network-interfaces get-effective-firewalls`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/get-effective-firewalls
- Google Cloud: Cloud NGFW quotas and limits: https://docs.cloud.google.com/firewall/docs/quotas
- Terraform Registry: `google_compute_network_firewall_policy_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_firewall_policy_rule

## Issues Found
- The prerequisite API command enabled `networksecurity.googleapis.com`, but the network firewall policy resources and `gcloud compute network-firewall-policies` commands use the Compute Engine API. Changed it to `compute.googleapis.com`.
- The default-deny section said DNS was required for FQDN firewall rules to work. Cloud NGFW resolves FQDN objects separately using Cloud DNS resolution order; workload DNS is still needed when applications connect by hostname. Reworded the DNS rule description accordingly.
- The ingress source FQDN section said matching relies on reverse DNS. Official documentation describes FQDN objects as being resolved to IP addresses and then programmed into firewall rules. Reworded the warning to describe IP-based enforcement and shared-IP caveats.
- The troubleshooting section claimed `get-effective-firewalls` shows resolved IPs for FQDN objects. The official command returns effective firewall rules for a VM network interface; reworded the claim to avoid promising resolved-IP output.
- The limitations section said wildcard FQDNs like `*.googleapis.com` are supported. Official Cloud NGFW documentation explicitly says wildcard characters are not supported. Replaced this with the correct limitation.

## Review Notes
The Terraform resource fields used in the post, including `dest_fqdns`, `dest_ip_ranges`, `layer4_configs`, and `google_compute_network_firewall_policy_association`, match current Terraform Google provider documentation. Google Cloud documentation also notes important FQDN caveats: each FQDN maps to at most 32 IPv4 and 32 IPv6 addresses, DNS answers can vary by region, and most Google domains such as `googleapis.com` can be poor fits for FQDN objects in some cases.
