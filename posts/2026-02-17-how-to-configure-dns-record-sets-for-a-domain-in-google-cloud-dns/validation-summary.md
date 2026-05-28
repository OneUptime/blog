# Validation Summary: How to Configure DNS Record Sets for a Domain in Google Cloud DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud DNS
- Google Cloud CLI (`gcloud dns record-sets`)
- DNS record types: A, AAAA, CNAME, MX, TXT, SRV, CAA, NS
- Email authentication records: SPF, DKIM, DMARC
- Google Workspace and Microsoft 365 DNS configuration

## Sources Consulted
- Google Cloud DNS: Add, update, and delete records: https://docs.cloud.google.com/dns/docs/records
- Google Cloud DNS records overview: https://docs.cloud.google.com/dns/docs/records-overview
- Google Cloud CLI reference for `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud CLI reference for `gcloud dns record-sets update`: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Google Cloud CLI reference for `gcloud dns record-sets delete`: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/delete
- Google Cloud CLI reference for `gcloud dns record-sets transaction add`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/transaction/add
- Google Cloud CLI reference for `gcloud dns record-sets transaction remove`: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/transaction/remove
- Google Workspace MX setup documentation: https://knowledge.workspace.google.com/admin/domains/set-up-mx-records-for-google-workspace
- Google Workspace SPF setup documentation: https://support.google.com/a/answer/33786
- RFC 1034, Domain Names - Concepts and Facilities: https://www.rfc-editor.org/rfc/rfc1034
- RFC 2782, A DNS RR for specifying the location of services: https://www.rfc-editor.org/rfc/rfc2782
- RFC 7208, Sender Policy Framework (SPF): https://www.rfc-editor.org/rfc/rfc7208
- RFC 8659, DNS Certification Authority Authorization (CAA) Resource Record: https://www.rfc-editor.org/rfc/rfc8659

## Issues Found
- The Google Workspace MX example used the older five-record `aspmx.l.google.com` configuration. Current Google Workspace documentation lists `smtp.google.com` as the MX value with priority `1`, while noting that the older `aspmx` records are legacy values for accounts that started before 2023 and remain supported. Updated the example to `--rrdatas="1 smtp.google.com."`.

## Review Notes
- The remaining `gcloud dns record-sets create`, `update`, `delete`, `list`, and transaction examples match the current Google Cloud CLI syntax.
- The CNAME apex restriction is accurate. Cloud DNS also supports a custom `ALIAS` record type for CNAME-like behavior at the zone apex, but the post's guidance to avoid apex CNAME records remains correct.
