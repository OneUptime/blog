# Validation Summary: How to Create GCP Firewall Rules with Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Google Cloud Provider (~> 5.0)
- Google Cloud Platform (GCP) VPC Firewall Rules
- Google Compute Engine (`google_compute_firewall`, `google_compute_instance`, `google_compute_network`, `google_compute_subnetwork`)
- GCP IAM Service Accounts (`google_service_account`)
- Google Kubernetes Engine (GKE) firewall considerations
- Cloud Logging / Firewall Rules Logging
- Private Google Access

## Sources Consulted
- Terraform `google_compute_firewall` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- GCP VPC firewall rules overview: https://cloud.google.com/firewall/docs/firewalls
- GCP implied firewall rules: https://cloud.google.com/firewall/docs/firewalls#default_firewall_rules
- GCP firewall rule components (priority, direction, targets): https://cloud.google.com/firewall/docs/firewalls#rule_components
- GCP firewall rules logging: https://cloud.google.com/firewall/docs/firewall-rules-logging
- GCP health check probe source ranges: https://cloud.google.com/load-balancing/docs/health-check-concepts (35.191.0.0/16, 130.211.0.0/22)
- Private Google Access special domains (private.googleapis.com at 199.36.153.8/30): https://cloud.google.com/vpc/docs/configure-private-google-access
- GKE control-plane to nodes port requirements (443, 10250): https://cloud.google.com/kubernetes-engine/docs/concepts/private-cluster-concept

## Issues Found
No technical issues found.

All technical claims, code examples, IP ranges, and Terraform resource configurations were verified against the official Google Cloud and Terraform provider documentation and are accurate:

- The two implied firewall rules (allow-all egress + deny-all ingress at priority 65535) are correctly described.
- Priority range (0–65535, lower = higher priority, default 1000) is accurate.
- `google_compute_firewall` argument names (`source_ranges`, `destination_ranges`, `source_tags`, `target_tags`, `source_service_accounts`, `target_service_accounts`, `direction`, `priority`, `description`, `log_config`, `allow`, `deny`) are all correct.
- The `log_config` block with `metadata = "INCLUDE_ALL_METADATA"` is a valid configuration.
- The health check source ranges (35.191.0.0/16 and 130.211.0.0/22) are the correct ranges for Google Cloud Load Balancing health checks.
- The 199.36.153.8/30 range is the correct VIP for private.googleapis.com.
- The post correctly avoids invalid combinations (e.g., does not mix `source_tags` with `target_service_accounts` in the same rule).
- HCL syntax, including `dynamic` blocks, `for_each`, and `optional()` type constraints (which require Terraform >= 1.3), is valid.
- The AWS Security Group vs GCP firewall rule comparison is accurate (both are stateful; GCP is VPC-level with tag/SA targeting).

## Review Notes
- The Google provider is pinned to `~> 5.0`. As of the validation date, the 6.x line of `hashicorp/google` is generally available. The 5.x line still works and remains a valid choice, but readers building new projects may wish to consider upgrading; this is not a technical error.
- The introduction briefly mentions "hierarchical firewall policies" but the post itself does not cover them. This is a content-scope observation rather than a technical inaccuracy and is left as-is.
- The GKE master CIDR example (`172.16.0.0/28`) is a common default for private clusters but is user-configurable; the post implicitly treats it as an example value, which is appropriate.
- The 8443 port in the GKE master-to-nodes example is correct for certain admission webhook backends; 443 and 10250 are the canonical ports for the API/webhook surface and the kubelet, respectively.
