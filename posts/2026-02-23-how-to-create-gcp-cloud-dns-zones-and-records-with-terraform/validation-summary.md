# Validation Summary: How to Create GCP Cloud DNS Zones and Records with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp configuration language)
- HashiCorp `hashicorp/google` provider (~> 5.0)
- Google Cloud DNS (managed DNS service)
- DNSSEC
- DNS record types (A, AAAA, CNAME, MX, TXT, SRV, CAA)
- Cloud DNS routing policies (WRR, geolocation)
- VPC networks (for private/peering/forwarding zones)

## Sources Consulted
- Terraform Google provider docs for `google_dns_managed_zone`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dns_managed_zone.html.markdown
- Terraform Google provider docs for `google_dns_record_set`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dns_record_set.html.markdown
- Google Cloud DNS documentation (general knowledge): https://cloud.google.com/dns/docs

## Issues Found
No technical issues found. Verified specifics:
- `dnssec_config.state = "on"` is a valid value (alongside `off`, `transfer`).
- `default_key_specs.algorithm = "rsasha256"` is valid; `key_type` values `keySigning` and `zoneSigning` are valid; 2048/1024 key lengths align with Google Cloud DNS defaults.
- `cloud_logging_config.enable_logging` is the correct field name.
- `private_visibility_config.networks.network_url`, `peering_config.target_network.network_url`, and `forwarding_config.target_name_servers` (with `ipv4_address` and `forwarding_path = "private"`) all match the provider schema.
- `routing_policy.wrr` (with `weight` + `rrdatas`) and `routing_policy.geo` (with `location` + `rrdatas`) are valid; region names `us-central1`, `europe-west1`, `asia-east1` are valid Google Cloud regions for geo routing.
- DNS record formats are correct: MX `<priority> <hostname>`, SRV `<priority> <weight> <port> <target>`, CAA `<flag> <tag> "<value>"`, TXT values double-quoted.
- Google Workspace MX hostnames (`aspmx.l.google.com.` etc.) are accurate.
- `gcloud dns dns-keys describe` is a real command used to retrieve DS record values.
- Trailing-dot requirement for `dns_name` and FQDN `rrdatas` is correctly stated.

## Review Notes
- The post pins the provider to `~> 5.0`. Google provider 6.x is the current major line as of mid-2026; the 5.x examples still work but readers wanting the latest features may want to bump the constraint. No code changes were needed because all resources/fields used remain valid in 6.x.
- For DNSSEC, the post correctly notes that DS records must also be configured at the registrar. The pointer to `gcloud dns dns-keys describe` is accurate; in practice users typically run `gcloud dns dns-keys list --zone=<zone>` first to obtain the key ID, then `describe`. This is a minor workflow detail, not a technical error.
- The internal blog links to `Cloud NAT` and `VPN Tunnels` posts follow the same pattern used across this Terraform/GCP series.
