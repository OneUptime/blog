# Validation Summary: How to Manage GCP Cloud DNS with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Google provider for Terraform/OpenTofu
- Google Cloud DNS
- Google Cloud VPC
- DNSSEC
- Cloud DNS forwarding zones
- Cloud DNS private managed zones
- HCL

## Sources Consulted
- HashiCorp Google provider docs: `google_dns_managed_zone`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dns_managed_zone.html.markdown
- HashiCorp Google provider docs: `google_dns_record_set`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dns_record_set.html.markdown
- HashiCorp Google provider docs: `google_sql_database_instance`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/sql_database_instance.html.markdown
- HashiCorp Google provider docs: `google_compute_global_address`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_global_address.html.markdown
- Google Cloud DNS: Create, modify, and delete zones  
  https://docs.cloud.google.com/dns/docs/zones
- Google Cloud DNS: Add, update, and delete records  
  https://docs.cloud.google.com/dns/docs/records
- Google Cloud DNS: Create a forwarding zone  
  https://docs.cloud.google.com/dns/docs/zones/forwarding-zones
- Google Cloud DNS: DNS zones overview  
  https://docs.cloud.google.com/dns/docs/zones/zones-overview
- Google Cloud DNS: DNSSEC overview  
  https://docs.cloud.google.com/dns/docs/dnssec
- Google Cloud DNS: Activate DNSSEC  
  https://cloud.google.com/dns/docs/registrars
- Google Cloud DNS: Records format (JSON)  
  https://docs.cloud.google.com/dns/docs/reference/json-record

## Issues Found
- The public zone example used `managed-by` as an unquoted map key in HCL. That is invalid syntax. I changed it to `"managed-by"` so the snippet is valid HCL.
- The DNSSEC best-practice note incorrectly said DS records come from `google_dns_managed_zone.dnssec_config`. That block configures DNSSEC state; it does not expose registrar DS records. I updated the note to point to the Cloud DNS Registrar setup view or `gcloud dns dns-keys list --filter='type=keySigning' --format='value(ds_record())' --zone=ZONE_NAME`, which matches Google’s documentation.
- The trailing-dot guidance was too broad. I revised it to accurately describe where fully qualified names should use trailing dots in Cloud DNS examples: zone `dns_name`, record `name`, and FQDN values in `rrdatas` such as CNAME and MX targets.

## Review Notes
- The post mentions DNS peering in the introduction and description but does not include a peering code example. This is technically accurate because the provider and Cloud DNS support peering zones, but the coverage is broader than the code shown.
- The forwarding-zone example is valid. `forwarding_path = "private"` is supported and appropriate when the target is reachable through the VPC path, such as via Cloud VPN or Cloud Interconnect.
