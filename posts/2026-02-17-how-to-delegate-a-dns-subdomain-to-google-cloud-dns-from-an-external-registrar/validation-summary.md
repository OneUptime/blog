# Validation Summary: How to Delegate a DNS Subdomain to Google Cloud DNS from an External Registrar

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Google Cloud DNS
- Google Cloud CLI (`gcloud`)
- DNS delegation and NS records
- DNSSEC and DS records
- Terraform Google provider
- `dig`

## Sources Consulted
- Google Cloud DNS overview: https://cloud.google.com/dns/docs/dns-overview
- Google Cloud DNS roles and permissions: https://cloud.google.com/dns/docs/access-control
- Google Cloud CLI `gcloud dns managed-zones create`: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud CLI `gcloud dns managed-zones update`: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/update
- Google Cloud CLI `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud CLI `gcloud dns dns-keys list`: https://cloud.google.com/sdk/gcloud/reference/dns/dns-keys/list
- Google Cloud DNS DNSSEC overview: https://cloud.google.com/dns/docs/dnssec
- Google Cloud DNS activate DNSSEC guide: https://cloud.google.com/dns/docs/registrars
- Terraform Google provider `google_dns_managed_zone`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Terraform Google provider `google_dns_record_set`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set

## Issues Found
- The prerequisite role was written as `dns.admin`; updated it to the full IAM role identifier `roles/dns.admin`, which is how Google Cloud documents the Cloud DNS Administrator role.
- The DNSSEC section used `gcloud dns managed-zones describe --format="json(dnssecConfig.defaultKeySpecs)"` to get DS record details. That field describes DNSSEC key configuration, not DS records. Replaced it with the documented `gcloud dns dns-keys list --filter='type=keySigning' --format='value(ds_record())' --zone=cloud-subdomain` command.

## Review Notes
The Cloud DNS zone creation, record creation, DNS delegation explanation, Terraform resource fields, and `dig` verification examples are consistent with current Google Cloud and Terraform provider documentation. The post correctly describes the need to publish child-zone NS records in the parent zone and to add DS records at the parent when DNSSEC is used.
