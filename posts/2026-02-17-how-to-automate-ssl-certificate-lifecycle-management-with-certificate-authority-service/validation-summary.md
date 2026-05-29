# Validation Summary: How to Automate SSL Certificate Lifecycle Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Certificate Authority Service
- Google Cloud CLI
- Certificate templates and CEL identity constraints
- Python Google Cloud CA Service client library
- Cloud Functions and Cloud Scheduler
- Secret Manager
- Terraform Google provider resources for Private CA
- Cloud Monitoring alerting policies
- OpenSSL CSR generation

## Sources Consulted
- Google Cloud CLI reference for `gcloud privateca pools create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/pools/create
- Google Cloud CLI reference for `gcloud privateca roots create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/roots/create
- Google Cloud CLI reference for `gcloud privateca subordinates create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/subordinates/create
- Google Cloud CLI reference for `gcloud privateca templates create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/templates/create
- Google Cloud CLI reference for `gcloud privateca certificates create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/certificates/create
- Google Cloud CLI reference for `gcloud privateca certificates revoke`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/certificates/revoke
- Google Cloud CA Service documentation for creating subordinate CAs: https://cloud.google.com/certificate-authority-service/docs/create-subordinate-ca
- Google Cloud CA Service Python sample for creating certificates: https://cloud.google.com/certificate-authority-service/docs/samples/privateca-create-certificate
- Google Cloud Python reference for `CertificateAuthorityServiceClient`: https://cloud.google.com/python/docs/reference/privateca/latest/google.cloud.security.privateca_v1.services.certificate_authority_service.CertificateAuthorityServiceClient
- Google Cloud CA Service RPC reference for `Certificate`: https://cloud.google.com/certificate-authority-service/docs/reference/rpc/google.cloud.security.privateca.v1
- Google Cloud Monitoring metrics reference for CA Service metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud CLI reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Registry documentation for `google_privateca_certificate_authority` and `google_privateca_certificate_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- The root and subordinate CA examples created CAs without enabling them. Added `--auto-enable` so later certificate issuance can work.
- The production two-tier hierarchy put the root and issuing subordinate in the same pool. Added a separate issuing CA pool and updated issuance, renewal, and revocation examples to use it.
- The certificate template commands omitted the required subject and SAN passthrough flags. Added `--copy-subject` and `--copy-sans`.
- The server CSR did not include a DNS SAN, even though the template CEL expression required DNS SANs. Added an OpenSSL `-addext` SAN value.
- The certificate issuance command used the wrong template flag and omitted the required certificate output flag. Replaced `--certificate-template` with `--template` and `--template-location`, and added `--cert-output-file`.
- The Python issuance example included an unnecessary `from google.cloud import security` import and used the common name directly in the certificate ID. Removed the unused import and sanitized dots in the generated certificate ID.
- The renewal Cloud Function imported CA Service from the wrong Python module path, shadowed the HTTP request object with a list request, used an unsupported timestamp conversion pattern, and relied on a brittle revocation filter. Updated the import, renamed the list request variable, converted protobuf timestamps with `ToDatetime()`, and skipped revoked certificates in Python.
- The revocation command used a positional certificate argument and an uppercase reason. Updated it to use `--certificate=server-cert-001` and `--reason=key_compromise`.
- The Cloud Monitoring alert command used non-existent threshold flags. Replaced them with the documented `--if="< 2592000"` and `--duration=0s` flags.

## Review Notes
The renewal function remains a scaffold: it identifies expiring certificates and calls `renew_certificate`, but the post still leaves the actual Secret Manager write and application reload mechanics to the reader. The CA expiration metric shown is for CA certificates, not individual end-entity certificates; the custom renewal function covers end-entity certificate checks.
