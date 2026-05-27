# Validation Summary: How to Use Certificate Manager to Manage SSL Certificates for GCP Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Certificate Manager
- Google-managed SSL/TLS certificates
- Certificate Manager DNS authorizations
- Certificate Manager load balancer authorization
- Certificate maps and map entries
- Google Cloud CLI (`gcloud`)
- Cloud Load Balancing target HTTPS proxies
- Terraform Google provider

## Sources Consulted
- Google Cloud Certificate Manager: Manage certificates: https://docs.cloud.google.com/certificate-manager/docs/certificates
- Google Cloud Certificate Manager: Manage DNS authorizations: https://docs.cloud.google.com/certificate-manager/docs/dns-authorizations
- Google Cloud Certificate Manager: Manage certificate maps: https://docs.cloud.google.com/certificate-manager/docs/maps
- Google Cloud Certificate Manager: Manage certificate map entries: https://docs.cloud.google.com/certificate-manager/docs/map-entries
- Google Cloud Certificate Manager: Certificate selection logic: https://cloud.google.com/certificate-manager/docs/certificate-selection-logic
- Google Cloud Load Balancing: Use Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud Load Balancing: SSL certificates overview: https://cloud.google.com/load-balancing/docs/ssl-certificates
- Google Cloud SDK reference: `gcloud certificate-manager certificates create`: https://docs.cloud.google.com/sdk/gcloud/reference/certificate-manager/certificates/create
- Terraform Google provider: `google_certificate_manager_certificate`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/certificate_manager_certificate
- Terraform Google provider: `google_certificate_manager_certificate_map_entry`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/certificate_manager_certificate_map_entry

## Issues Found
- Corrected the comparison table's classic certificate authorization wording. Compute Engine Google-managed SSL certificates use load-balancer-based DNS/IP visibility validation, not an explicit HTTP-01-only workflow.
- Fixed the load balancer authorization `gcloud certificate-manager certificates create` command. `--issuance-config` is for CA Service issuance, not public Google-managed certificates with load balancer authorization.
- Clarified that load balancer authorization still requires the domain to resolve to the load balancer and that the forwarding rule must include TCP port 443.
- Fixed the default certificate map entry command to use `--set-primary`; omitting `--hostname` alone is not the documented way to create a primary map entry.
- Expanded the Terraform example to include wildcard and primary certificate map entries so the snippet matches the article's described wildcard and default-entry setup.
- Corrected the common mistake about missing default entries to match Certificate Manager selection logic: unmatched SNI falls back to the primary entry, while clients without SNI fail if no primary entry is configured.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK and Certificate Manager documentation rather than local `--help` output.
