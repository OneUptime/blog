# Validation Summary: How to Create a Private Root Certificate Authority Using GCP CA Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Certificate Authority Service
- Google Cloud CLI (`gcloud privateca`)
- Public Key Infrastructure (PKI)
- TLS certificates and certificate revocation
- Python Google Cloud Private CA client library
- Terraform Google provider
- OpenSSL

## Sources Consulted
- Google Cloud CA Service tiers: https://docs.cloud.google.com/certificate-authority-service/docs/tiers
- Google Cloud CA Service concepts: https://docs.cloud.google.com/certificate-authority-service/docs/ca-service-concepts
- Google Cloud CA Service root CA creation: https://cloud.google.com/certificate-authority-service/docs/creating-root-ca
- Google Cloud CA Service certificate requests: https://docs.cloud.google.com/certificate-authority-service/docs/requesting-certificates
- Google Cloud CA Service issuance policies: https://cloud.google.com/certificate-authority-service/docs/use-issuance-policy
- Google Cloud CA Service certificate revocation: https://cloud.google.com/certificate-authority-service/docs/revoking-certificates
- Google Cloud CLI `gcloud privateca pools create`: https://cloud.google.com/sdk/gcloud/reference/privateca/pools/create
- Google Cloud CLI `gcloud privateca roots create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/roots/create
- Google Cloud CLI `gcloud privateca subordinates create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/subordinates/create
- Google Cloud CLI `gcloud privateca certificates create`: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/certificates/create
- Google Cloud Python Private CA `CertificateConfig`: https://cloud.google.com/python/docs/reference/privateca/latest/google.cloud.security.privateca_v1.types.CertificateConfig
- Google Cloud Python Private CA `X509Parameters`: https://cloud.google.com/python/docs/reference/privateca/latest/google.cloud.security.privateca_v1.types.X509Parameters
- Terraform Google provider `google_privateca_ca_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/privateca_ca_pool
- Terraform Google provider `google_privateca_certificate_authority`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/privateca_certificate_authority

## Issues Found
- The post described the root CA as offline in the DevOps tier and said the DevOps tier only supports subordinate CAs. Updated this to match Google Cloud documentation: both tiers use HSM-backed CA keys; Enterprise supports certificate lifecycle operations such as revocation; DevOps is optimized for high-volume short-lived issuance and does not track certificates for revocation.
- The subordinate CA pool used the DevOps tier, but the tutorial later revokes a certificate from that pool. Changed the subordinate pool to Enterprise so listing/revocation lifecycle operations are supported.
- The root and subordinate CA creation commands did not enable the CAs before later issuance steps. Added `--auto-enable` to the `gcloud privateca roots create` and `gcloud privateca subordinates create` commands.
- The generated-key certificate command omitted the required certificate profile or explicit key usage flags. Added `--use-preset-profile=leaf_server_tls`.
- The generated-key certificate command used `--cert-chain-output-file`, which is not a supported `gcloud privateca certificates create` flag. Replaced it with the supported `--cert-output-file`, which writes the PEM-encoded certificate chain.
- The post stated that CA Service automatically publishes CRLs and supports OCSP for real-time revocation checking. Updated this to say CA Service publishes CRLs for Enterprise-tier pools when CRL publication is enabled and that clients use the CRL Distribution Point extension for revocation checking.
- The Terraform snippet used a DevOps subordinate CA pool and omitted the issuance policy and CRL publishing configuration shown in the CLI flow. Updated it to use an Enterprise pool with `publishing_options` and matching `issuance_policy` settings.

## Review Notes
The Python sample uses the current `security_privateca_v1` client types and the current `CertificateConfig.x509_config` field. The workspace does not have `gcloud` installed, so CLI validation was performed against the official Google Cloud CLI reference instead of local `--help` output.
