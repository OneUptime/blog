# Validation Summary: How to Configure GCP IPv6-to-IPv4 Translation at Load Balancer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Load Balancing
- Global external Application Load Balancer
- IPv6
- IPv4
- Terraform
- `gcloud` CLI
- HTTP headers
- `curl`

## Sources Consulted
- Google Cloud, IPv6 for Application Load Balancers and proxy Network Load Balancers: https://cloud.google.com/load-balancing/docs/ipv6
- Google Cloud, Convert Application Load Balancer to IPv6: https://cloud.google.com/load-balancing/docs/https/convert-global-ext-https-dualstack
- Google Cloud, External Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/https
- Google Cloud, Forwarding rules overview: https://cloud.google.com/load-balancing/docs/forwarding-rule-concepts
- Google Cloud, Backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud SDK reference, `gcloud compute addresses describe`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/describe
- HashiCorp Google provider docs, `google_compute_backend_service`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_backend_service.html.markdown
- HashiCorp Google provider docs, `google_compute_global_forwarding_rule`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_global_forwarding_rule.html.markdown
- HashiCorp Google provider docs, `google_compute_global_address`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_global_address.html.markdown
- HashiCorp Google provider docs, `google_compute_target_https_proxy`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_target_https_proxy.html.markdown
- curl man page, `--resolve`: https://curl.se/docs/manpage.html#--resolve

## Issues Found
- The post used legacy "Global External HTTP(S) Load Balancer" wording while the Terraform example was better expressed using the current global external Application Load Balancer model. I updated the introduction and Terraform snippet to use current terminology and `load_balancing_scheme = "EXTERNAL_MANAGED"` so the example matches current GCP documentation.
- The backend service example omitted the named backend port for an instance group backend. I added `port_name = "http"` and clarified that the instance group must expose the matching named port.
- The `X-Forwarded-For` example was inaccurate for an IPv6 frontend. It showed an IPv4 load balancer address and said the first IP is always the client IP. Google Cloud documents the format as existing values, then client IP, then load balancer forwarding-rule IP. I corrected the example and explanation accordingly.
- The IPv6 verification command used `curl -6 https://[GCP_IPV6_ADDRESS]/`, which is not a correct validation pattern for a normal HTTPS deployment because certificate validation and SNI are hostname-based. I replaced it with `curl --resolve` so the example keeps the hostname while forcing the IPv6 address.
- The logging guidance assumed backend access logs would automatically expose `X-Forwarded-For`, and the limitations section mentioned FTP active mode even though this post is about an HTTP(S) Application Load Balancer. I replaced both with accurate guidance tied to proxy logs and end-to-end IPv6 behavior.

## Review Notes
- Google Cloud allocates a `/64` IPv6 range to an IPv6 forwarding rule. The `gcloud compute addresses describe` command prints one address from that range, and other addresses from the same range can appear as the load balancer IP in `X-Forwarded-For`.
- `gcloud` and `terraform` were not installed in this environment, so command and Terraform validation was done against the official Google Cloud and HashiCorp documentation rather than local CLI help or an applied test configuration.
