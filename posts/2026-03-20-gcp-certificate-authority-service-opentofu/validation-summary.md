# Validation Summary: How to Set Up GCP Certificate Authority Service with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Certificate Authority Service (CAS)
- OpenTofu
- Terraform/OpenTofu HCL
- HashiCorp Google provider for Private CA resources
- HashiCorp TLS provider
- X.509, PKI, and mTLS

## Sources Consulted
- Google Cloud Certificate Authority Service overview: https://cloud.google.com/certificate-authority-service/docs/ca-service-overview
- Google Cloud root CA guide: https://cloud.google.com/certificate-authority-service/docs/creating-certificate-authorities
- Google Cloud subordinate CA guide: https://cloud.google.com/certificate-authority-service/docs/create-subordinate-ca
- Google Cloud certificate request guide: https://cloud.google.com/certificate-authority-service/docs/requesting-certificates
- Google Cloud CEL guide for CA Service issuance policies: https://cloud.google.com/certificate-authority-service/docs/using-cel
- Google Cloud sample for creating a certificate with Terraform: https://cloud.google.com/certificate-authority-service/docs/samples/privateca-create-certificate-config
- HashiCorp Google provider docs for `google_privateca_ca_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/privateca_ca_pool.html.markdown
- HashiCorp Google provider docs for `google_privateca_certificate_authority`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/privateca_certificate_authority.html.markdown
- HashiCorp Google provider docs for `google_privateca_certificate`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/privateca_certificate.html.markdown
- HashiCorp TLS provider docs for `tls_private_key`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key

## Issues Found
- The CA pool example used `allowed_domains_policy`, which is not a valid `google_privateca_ca_pool.issuance_policy` block in the current Google provider. I replaced it with a supported `identity_constraints` block using a CEL expression to restrict DNS SANs to the intended internal suffixes.
- The subordinate CA example was incomplete for a managed Google Cloud parent CA. I added `subordinate_config` to point at the root CA, set `desired_state = "ENABLED"` so the subordinate can issue certificates, and added `zero_max_issuer_path_length = true` to make it a leaf-issuing intermediate.
- The subordinate CA `key_usage` block was missing the required `extended_key_usage` block for the current provider schema. I added an empty `extended_key_usage {}` block to keep the resource valid without changing the intended behavior.
- The certificate example incorrectly used `key_spec` on `google_privateca_certificate`. That resource requires either `pem_csr` or `config.public_key`. I replaced the invalid block with a valid `tls_private_key` resource plus `config.public_key`.
- The certificate subject omitted `organization`, which is required by the current `google_privateca_certificate` schema. I added `organization = "Example Corp"`.
- The certificate example set `key_encipherment` while using an ECDSA P-256 key. I removed `key_encipherment`, kept `digital_signature`, and explicitly set `ca_options.is_ca = false` for the leaf certificate use case.
- The original certificate example did not target the subordinate CA, which undermined the article’s stated hierarchy. I added `certificate_authority = google_privateca_certificate_authority.intermediate_ca.certificate_authority_id` so the leaf certificate is issued by the intermediate CA.

## Review Notes
- `tls_private_key` stores private key material in OpenTofu/Terraform state. In production, the state backend should be encrypted and tightly access-controlled.
- Root CAs created through the Google provider are enabled by default unless `desired_state = "STAGED"` is set. The post now explicitly issues the service certificate from the subordinate CA, which preserves the intended root/intermediate/leaf hierarchy.
