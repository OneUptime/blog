# Validation Summary: How to Create GCP Cloud DNS Record Sets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HashiCorp `hashicorp/google` provider (~> 5.0)
- GCP Cloud DNS (`google_dns_managed_zone`, `google_dns_record_set`)
- GCP Compute (`google_compute_global_address`, `google_compute_network`)
- DNSSEC
- Standard DNS record types: A, CNAME, MX, TXT
- Private DNS zones with VPC visibility

## Sources Consulted
- google_dns_managed_zone resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- google_dns_record_set resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set
- google_compute_global_address resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address
- HashiCorp Google provider releases: https://releases.hashicorp.com/terraform-provider-google/
- GCP Cloud DNS documentation on record formatting (TXT quoting, MX priority/host format, trailing dots on FQDNs)

## Issues Found
No technical issues found. All resource names, argument names, attribute references, and DNS record formatting (escaped quotes for TXT, "priority hostname." for MX, trailing dots on FQDNs) are correct. The `dnssec_config { state = "on" }`, `private_visibility_config { networks { network_url = ... } }`, and `name_servers` output attribute are all valid in the current provider.

## Review Notes
- Provider version constraint `~> 5.0` is functional but lags the current provider line (7.x as of 2026). The constraint will still resolve to a working v5 release; readers wanting newer features may want to bump to `~> 6.0` or later. Not a correctness issue, so left as-is.
- The `region = "us-central1"` in the provider block is harmless but unused for DNS-only deployments since Cloud DNS is a global service.
- The Private DNS Zone snippet references `google_compute_network.main` without defining it inline — readers will need to supply that resource themselves. Acceptable for an illustrative snippet.
- TXT record example uses escaped double quotes correctly; readers should note that strings longer than 255 characters must be split into multiple space-separated quoted segments within a single rrdatas entry.
