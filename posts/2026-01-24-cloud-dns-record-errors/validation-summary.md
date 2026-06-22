# Validation Summary: How to Fix 'Cloud DNS' Record Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud DNS
- Google Cloud CLI (`gcloud`)
- DNS records and DNS delegation
- DNSSEC
- Private Cloud DNS zones and DNS server policies
- Terraform Google provider

## Sources Consulted
- Google Cloud DNS overview: https://cloud.google.com/dns/docs/overview
- Google Cloud DNS general DNS overview: https://cloud.google.com/dns/docs/dns-overview
- Google Cloud DNS records guide: https://cloud.google.com/dns/docs/records
- Google Cloud DNS troubleshooting guide: https://cloud.google.com/dns/docs/troubleshooting
- Google Cloud DNS DNSSEC overview: https://cloud.google.com/dns/docs/dnssec
- Google Cloud DNS DNSSEC management guide: https://cloud.google.com/dns/docs/dnssec-config
- Google Cloud DNS advanced DNSSEC guide: https://cloud.google.com/dns/docs/dnssec-advanced
- Google Cloud DNS server policies guide: https://cloud.google.com/dns/docs/policies
- Google Cloud CLI reference for `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud CLI reference for `gcloud dns record-sets update`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Google Cloud CLI reference for `gcloud dns dns-keys describe`: https://cloud.google.com/sdk/gcloud/reference/dns/dns-keys/describe
- Google Cloud CLI reference for `gcloud dns managed-zones update`: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/update
- Terraform Registry, Google provider `google_dns_record_set`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set

## Issues Found
- The trailing-dot section incorrectly stated that DNS records always require fully qualified names with trailing dots and labeled the no-dot `gcloud` command as strictly wrong. Google Cloud examples show `gcloud` accepting DNS names without trailing dots in some contexts, while fully qualified trailing-dot names remain the safer explicit form. Updated the section to describe consistent trailing-dot usage as best practice and added the missing TTL to the avoid example.
- The DNSSEC DS-record example used `gcloud dns managed-zones describe --format="value(dnssecConfig.defaultKeySpecs)"`, which returns key spec configuration, not the DS record to publish at the registrar. Replaced it with `gcloud dns dns-keys list` to identify the KSK and `gcloud dns dns-keys describe ... --format="value(ds_record())"` to retrieve the DS record.
- The private-zone policy section implied that an inbound DNS server policy is needed for VM resolution through Cloud DNS. Google Cloud private zones normally resolve from authorized VPC VMs through the metadata server. Added a metadata-server `dig` check and clarified that inbound and outbound DNS policies are for hybrid DNS scenarios.

## Review Notes
`gcloud` and `terraform` were not installed in the workspace, so CLI syntax and Terraform resource fields were verified against official Google Cloud and Terraform Registry documentation rather than local command execution.
