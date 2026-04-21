# Validation Summary: How to Deploy a Static Site on GCP Cloud Storage with OpenTofu

## Status
validated

## Post Type
Tutorial / infrastructure-as-code guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Google Cloud Storage
- Google Cloud CDN
- Google Cloud Load Balancing
- Google-managed SSL certificates
- Cloud DNS
- Google Cloud CLI storage commands

## Sources Consulted
- Google Cloud Storage static website hosting: https://cloud.google.com/storage/docs/hosting-static-website
- Google Cloud Storage domain-named bucket verification: https://cloud.google.com/storage/docs/domain-name-verification
- Google Cloud Storage configured bucket Terraform sample: https://cloud.google.com/storage/docs/samples/storage-static-website-parent-tag
- Google Cloud CDN Terraform examples: https://cloud.google.com/cdn/docs/cdn-terraform-examples
- Google Cloud CDN cache modes: https://cloud.google.com/cdn/docs/using-cache-modes
- Google Cloud CDN caching overview: https://cloud.google.com/cdn/docs/caching
- Google-managed SSL certificates for Cloud Load Balancing: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Compute Engine global forwarding rules REST reference: https://cloud.google.com/compute/docs/reference/rest/v1/globalForwardingRules
- Google Cloud Storage gsutil tool guidance: https://cloud.google.com/storage/docs/gsutil
- gcloud storage rsync reference: https://cloud.google.com/sdk/gcloud/reference/storage/rsync
- Terraform Google provider generated docs for `google_storage_bucket`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket.html.markdown
- Terraform Google provider generated docs for `google_compute_backend_bucket`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_bucket.html.markdown
- Terraform Google provider generated docs for `google_compute_global_forwarding_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_global_forwarding_rule.html.markdown
- Terraform Google provider generated docs for `google_compute_managed_ssl_certificate`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_managed_ssl_certificate.html.markdown
- Terraform Google provider generated docs for `google_dns_record_set`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/dns_record_set.html.markdown

## Issues Found
- The introductory wording implied that both HTTPS and a custom domain independently require a load balancer. Cloud Storage supports custom domains over HTTP, but HTTPS on a custom domain requires an HTTPS load balancer and certificate, so the sentence was tightened.
- The bucket example names the bucket with `var.domain_name`. Cloud Storage requires authorization or verification before creating a domain-named bucket, so a short prerequisite note was added.
- The best-practice bullet said direct bucket website hosting lacked custom domain support. Direct bucket website hosting can use a custom domain over HTTP; the load balancer is needed for HTTPS and Cloud CDN on that domain, so the wording was corrected.
- The SSL certificate readiness note said provisioning takes 10-60 minutes and that the load balancer returns 502s until ready. Google documents up to 60 minutes for certificate provisioning after DNS and load balancer configuration propagate, plus additional propagation time; the static website guide describes 60-90 minutes. The note was corrected to say HTTPS might not be usable until the certificate is active.
- The upload guidance recommended `gsutil rsync`. Google now documents `gsutil` as a legacy, minimally maintained CLI and recommends `gcloud storage` commands, so the recommendation was updated to `gcloud storage rsync`.

## Review Notes
The OpenTofu/Terraform resource names and arguments used in the snippets match the current Google provider documentation and Google Cloud examples. The Cloud DNS `www` CNAME to the apex record is valid for Google-managed certificate validation when the CNAME ultimately resolves to the load balancer IP, although direct A/AAAA records for each certificate hostname are also commonly recommended.
