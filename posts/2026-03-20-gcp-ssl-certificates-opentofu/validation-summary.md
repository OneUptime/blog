# Validation Summary: How to Manage GCP SSL Certificates with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Google Cloud Load Balancing
- Google-managed SSL certificates
- Self-managed SSL certificates
- Cloud DNS
- GKE Ingress `ManagedCertificate`
- Kubernetes provider `kubernetes_manifest`

## Sources Consulted
- Google Cloud: Use Google-managed SSL certificates - https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud: Set up a global external Application Load Balancer with VM instance group backends - https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud: Set up an HTTP-to-HTTPS redirect for global external Application Load Balancers - https://cloud.google.com/load-balancing/docs/https/setting-up-global-http-https-redirect
- Google Cloud: Backend services overview - https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud: Use SSL policies for SSL and TLS protocols - https://cloud.google.com/load-balancing/docs/use-ssl-policies
- Google Cloud: Using Google-managed SSL certificates on GKE - https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- Google provider docs source: `google_compute_managed_ssl_certificate` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_managed_ssl_certificate.html.markdown
- Google provider docs source: `google_compute_target_https_proxy` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_target_https_proxy.html.markdown
- Google provider docs source: `google_compute_global_forwarding_rule` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_global_forwarding_rule.html.markdown
- Google provider docs source: `google_compute_ssl_policy` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_ssl_policy.html.markdown
- Google provider docs source: `google_compute_ssl_certificate` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_ssl_certificate.html.markdown
- Google provider docs source: `google_dns_record_set` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dns_record_set.html.markdown
- Kubernetes provider docs source: `kubernetes_manifest` - https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/manifest.md

## Issues Found
- The managed certificate requested `var.domain_name`, `www.${var.domain_name}`, and `api.${var.domain_name}`, but the DNS example only created `A` records for the apex and `api` hostnames. I added the missing `www` record because Google Cloud requires each hostname on the certificate to resolve to the load balancer IP.
- The backend service example used an instance group backend for an Application Load Balancer but omitted `port_name`. I added `port_name = "http"` because proxy-based load balancers using instance group backends rely on a named port on the backend service and instance group.
- The HTTP redirect forwarding rule omitted `load_balancing_scheme = "EXTERNAL_MANAGED"`. I added it so the redirect example matches Google Cloud's global external Application Load Balancer configuration instead of implicitly falling back to the classic scheme.
- The GKE `ManagedCertificate` snippet implied the manifest alone was sufficient. I clarified that the certificate must also be attached to an Ingress with the `networking.gke.io/managed-certificates` annotation for provisioning to complete.
- The best-practices section overstated how Google-managed certificates activate and rotate. I corrected the text to reflect that certificates can be created before the load balancer, only become `ACTIVE` after target proxy and DNS conditions are met, and should remain attached alongside the old certificate during replacement until the new one is active.

## Review Notes
- Compute Engine Google-managed SSL certificates remain valid for global external Application Load Balancers, classic Application Load Balancers, and external proxy Network Load Balancers, but they are not the general solution for every GCP load balancer type. Certificate Manager is the newer option for broader certificate-management scenarios.
- GKE `ManagedCertificate` resources are for external Application Load Balancer Ingress and do not support wildcard domains.
