# Validation Summary: How to Create a Public Managed DNS Zone in Google Cloud DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS
- Google Cloud CLI (`gcloud`)
- DNS managed zones and record sets
- DNSSEC
- Terraform Google provider
- DNS tools (`dig`, `whois`)

## Sources Consulted
- Google Cloud CLI reference: `gcloud dns managed-zones create` - https://docs.cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud CLI reference: `gcloud dns record-sets create` - https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud DNS records guide - https://docs.cloud.google.com/dns/docs/records
- Google Cloud DNS DNSSEC configuration guide - https://docs.cloud.google.com/dns/docs/dnssec-config
- Google Cloud DNS registrar DNSSEC activation guide - https://docs.cloud.google.com/dns/docs/registrars
- Google Cloud DNS pricing - https://cloud.google.com/dns/pricing
- Google Workspace Admin Help: Set up MX records - https://support.google.com/a/answer/174125
- Terraform Google provider: `google_dns_managed_zone` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Terraform Google provider: `google_dns_record_set` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set
- Squarespace Help Center: Google Domains migration - https://support.squarespace.com/hc/en-us/articles/17131164996365-About-the-Google-Domains-migration-to-Squarespace

## Issues Found
- The Google Workspace MX example used `smtp2.google.com.`, which is not the current Google Workspace MX target. Updated the example to use the official single MX target, `1 smtp.google.com.`.
- The DNSSEC command for registrar DS records used `gcloud dns managed-zones describe` with `dnsSecConfig.defaultKeySpecs`, which returns key specification configuration rather than DS records. Replaced it with the official `gcloud dns dns-keys list --filter='type=keySigning' --format='value(ds_record())' --zone=my-zone` command.
- The registrar example listed Google Domains, which has been migrated to Squarespace Domains. Updated the example registrar list to use Squarespace Domains.

## Review Notes
The remaining Cloud DNS CLI commands, Terraform resource fields, record-set examples, DNSSEC enablement command, public-zone explanation, and pricing summary are consistent with the official documentation reviewed. The example A and AAAA records use documentation address ranges, which is appropriate for a tutorial but should be replaced with real service addresses in production.
