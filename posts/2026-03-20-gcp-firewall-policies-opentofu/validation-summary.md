# Validation Summary: How to Create GCP Firewall Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Cloud NGFW firewall policies
- OpenTofu / Terraform HCL
- Google provider resources for Compute networking

## Sources Consulted
- Google Cloud: Hierarchical firewall policies — https://cloud.google.com/firewall/docs/firewall-policies
- Google Cloud: Firewall policy rule components — https://cloud.google.com/firewall/docs/firewall-policies-rule-details
- Google Cloud: VPC firewall rules overview — https://cloud.google.com/firewall/docs/firewalls
- Terraform Google provider: `google_compute_firewall_policy` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_firewall_policy.html.markdown
- Terraform Google provider: `google_compute_firewall_policy_rule` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_firewall_policy_rule.html.markdown
- Terraform Google provider: `google_compute_firewall_policy_association` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_firewall_policy_association.html.markdown
- Terraform Google provider: `google_compute_network_firewall_policy` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_network_firewall_policy.html.markdown
- Terraform Google provider: `google_compute_network_firewall_policy_rule` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_network_firewall_policy_rule.html.markdown
- Terraform Google provider: `google_compute_network_firewall_policy_association` — https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_network_firewall_policy_association.html.markdown

## Issues Found
- The overview said firewall policies are a "modern replacement" for per-VPC firewall rules. I changed this to say they work alongside per-VPC firewall rules, which matches Google Cloud's documented evaluation model.
- The hierarchical firewall policy association used `google_compute_firewall_policy.org_policy.name` for `firewall_policy`. I changed it to `.id` to match the provider's documented association example.
- The network firewall policy association used `google_compute_network_firewall_policy.vpc_policy.name` for `firewall_policy`. I changed it to `.id` to match the provider's documented association example.
- The network firewall policy example referenced `google_compute_network.vpc.id` without defining that VPC resource. I added a minimal `google_compute_network "vpc"` resource so the snippet is self-contained.

## Review Notes
- Rule resources are correctly shown using firewall policy `name`, while association resources use firewall policy `id`. That distinction is provider-specific and worth preserving in future edits.
