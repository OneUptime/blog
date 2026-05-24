# Validation Summary: How to Create GCP Certificate Manager with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Google Provider (~> 5.0)
- Google Cloud Certificate Manager
- Google Cloud DNS
- Google Cloud Load Balancing (HTTPS Target Proxy, URL Map)
- Google Cloud Certificate Authority Service
- gcloud CLI (`certificate-manager` command group)
- SSL/TLS certificates (Google-managed and self-managed)

## Sources Consulted
- Terraform Google provider docs for `google_certificate_manager_dns_authorization`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/certificate_manager_dns_authorization.html.markdown
- Terraform Google provider docs for `google_certificate_manager_certificate`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/certificate_manager_certificate.html.markdown
- Terraform Google provider docs for `google_certificate_manager_certificate_map_entry`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/certificate_manager_certificate_map_entry.html.markdown
- Terraform Google provider docs for `google_compute_target_https_proxy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_target_https_proxy.html.markdown
- Terraform Google provider docs for `google_certificate_manager_certificate_issuance_config`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/certificate_manager_certificate_issuance_config.html.markdown
- Google Cloud Certificate Manager documentation: https://cloud.google.com/certificate-manager/docs

## Issues Found
No technical issues found. All resource names, argument names, and attribute references match the current Google Terraform provider documentation:

- `google_certificate_manager_dns_authorization.dns_resource_record[0].{name,type,data}` is the correct attribute structure.
- `managed { domains, dns_authorizations }` and `self_managed { pem_certificate, pem_private_key }` are the correct block arguments.
- `google_certificate_manager_certificate_map_entry` correctly uses `hostname` for SNI entries and `matcher = "PRIMARY"` for the fallback default entry.
- The `//certificatemanager.googleapis.com/` URI prefix on `google_compute_target_https_proxy.certificate_map` is required.
- The issuance config uses correct arguments (`lifetime`, `rotation_window_percentage`, `key_algorithm = "ECDSA_P256"`, and the `certificate_authority_config > certificate_authority_service_config > ca_pool` nesting). The `2592000s` lifetime (30 days) is within the documented valid range of 21-30 days.
- The gcloud commands (`gcloud certificate-manager certificates list` and `describe`) are valid.
- The CA pool resource path format `projects/{project}/locations/{location}/caPools/{caPool}` is correct.

## Review Notes
- The post pins the provider at `~> 5.0`. The Google provider has since released a 6.x major version; the pinned 5.x line still works but readers wishing to use newer features may want to update. Not flagged as an error since 5.x is still valid and widely used.
- The `self_managed` block also has legacy fields `certificate_pem` and `private_key_pem` which are deprecated in favor of `pem_certificate` and `pem_private_key`. The post correctly uses the non-deprecated names.
- The post mentions that load balancer authorization will not work for wildcard certs, which is accurate per Google Cloud docs — wildcard managed certificates require DNS authorization.
- The 30-day `lifetime` (2592000s) sits at the upper bound of the valid 21-30 day range for Certificate Authority Service-backed issuance configs; this is correct but worth noting for readers who try larger values.
