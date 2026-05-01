# Validation Summary: How to Manage GCP Firewall Rules with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Provider for Terraform/OpenTofu
- Google Cloud VPC firewall rules
- Google Cloud CLI (`gcloud`)
- HCL

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- HashiCorp Google provider `google_compute_firewall` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- HashiCorp Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- HashiCorp Terraform Registry provider API for current Google provider version: https://registry.terraform.io/v1/providers/hashicorp/google
- Google Cloud VPC firewall rules overview: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud guide for using VPC firewall rules: https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud CLI reference for listing firewall rules: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- Google Cloud Firewall Rules Logging: https://cloud.google.com/firewall/docs/firewall-rules-logging
- Google Cloud Firewall Insights overview: https://cloud.google.com/network-intelligence-center/docs/firewall-insights/concepts/overview
- Google Cloud secure tags and network tags overview: https://cloud.google.com/firewall/docs/tags-firewalls-overview

## Issues Found
- The post pinned the Google provider to `~> 5.0`, which is outdated relative to the current provider major line. I updated it to `~> 7.0`.
- The examples referenced `google_compute_network.main` but never defined it. I added a minimal `google_compute_network` resource in the setup snippet so the later references are valid.
- The internal traffic example used `google_compute_network.main.subnetworks_self_links[0]` as a `source_ranges` value. `source_ranges` requires CIDR ranges, not subnetwork self-links. I replaced it with `var.vpc_subnet_cidrs` and clarified the description accordingly.
- The service-account example combined `source_service_accounts` with `target_tags`. The Google provider documentation marks that combination as invalid. I changed the target selector to `target_service_accounts` and added a corresponding database service account resource.
- The `gcloud compute firewall-rules list` example only surfaced `allowed` fields, which is incomplete for a post that also demonstrates deny rules. I updated it to the documented `ALLOW`/`DENY` table format.
- The best-practices section said target tags apply to specific instance groups. In GCP VPC firewall rules, target network tags apply to VM instances. I corrected the wording to `specific instances`.

## Review Notes
- The examples still assume the reader will supply `var.project_id` and appropriate CIDR values for `var.vpc_subnet_cidrs`.
- The egress section is technically correct: an explicit deny rule at priority `65534` overrides the implied allow egress rule at priority `65535`, while the HTTPS allow rule at priority `1000` is evaluated first.
- The logging recommendation is correct. If the post later adds a logging code example, it should use `log_config`; the older `enable_logging` field is deprecated in the Google provider documentation.
