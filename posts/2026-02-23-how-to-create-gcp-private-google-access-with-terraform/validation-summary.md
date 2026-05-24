# Validation Summary: How to Create GCP Private Google Access with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp google provider)
- Google Cloud Platform (GCP)
- VPC networking (`google_compute_network`, `google_compute_subnetwork`)
- Private Google Access (`private_ip_google_access`)
- Cloud NAT (`google_compute_router`, `google_compute_router_nat`)
- Private Service Connect (PSC) for Google APIs (`google_compute_global_address`, `google_compute_global_forwarding_rule`)
- Cloud DNS private zones (`google_dns_managed_zone`, `google_dns_record_set`)
- Private Service Access / Service Networking (`google_service_networking_connection`)
- Cloud SQL with private IP (`google_sql_database_instance`)
- VPC firewall rules (`google_compute_firewall`)
- Compute Engine instances (`google_compute_instance`)

## Sources Consulted
- [Configure Private Google Access (Google Cloud)](https://cloud.google.com/vpc/docs/configure-private-google-access)
- [Configure Private Service Connect for Google APIs (Google Cloud)](https://cloud.google.com/vpc/docs/configure-private-service-connect-apis)
- [Terraform `google_compute_subnetwork` docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork)
- [Terraform `google_compute_router_nat` docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat)
- [Terraform `google_compute_global_address` docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address)
- [Terraform `google_compute_global_forwarding_rule` docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule)
- [Terraform `google_service_networking_connection` docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_networking_connection)

## Issues Found
1. **Reversed IP-range comments in firewall rule.** The destination range comments for `private.googleapis.com` and `restricted.googleapis.com` were swapped. Per Google's documentation, `private.googleapis.com` is `199.36.153.8/30` and `restricted.googleapis.com` is `199.36.153.4/30`. Updated the inline comments to reflect the correct mapping.
2. **Misleading "CNAME" comment.** The DNS record set for `restricted.googleapis.com.` was labeled "CNAME for the restricted API domain", but the resource creates an `A` record (`type = "A"`). Changed the comment to "A record for the restricted API domain" to match the resource.

## Review Notes
- The `restricted.googleapis.com.` A record is technically redundant with the existing `*.googleapis.com.` wildcard A record (the wildcard would match it), but it does no harm and makes intent explicit. Specific records take precedence over wildcards in DNS, so leaving both is acceptable.
- The `*.googleapis.com.` wildcard does not cover the apex `googleapis.com.` — if any client ever queries the apex directly, an additional A record at the zone apex would be needed. This is uncommon in practice and not worth flagging in-post.
- Similar apex coverage gap exists for the `gcr.io.` and `pkg.dev.` zones (wildcard only, no apex record). Not strictly incorrect, but a polished setup may also add apex A records.
- `target = "all-apis"` for the PSC endpoint exposes all supported Google APIs; `target = "vpc-sc"` restricts to APIs that work with VPC Service Controls — both are valid and current.
- `load_balancing_scheme = ""` (explicitly empty) is the documented setting for PSC consumer forwarding rules — verified.
- Code uses `database_version = "POSTGRES_15"` and `debian-cloud/debian-12` image, both current and supported as of the validation date.
