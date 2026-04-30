# Validation Summary: How to Configure GCP Load Balancer with IPv6 Using Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud external Application Load Balancer
- Terraform Google provider
- IPv6 networking on Google Cloud
- Cloud DNS
- Google-managed SSL certificates

## Sources Consulted
- Google Cloud: Application Load Balancer overview - https://cloud.google.com/load-balancing/docs/application-load-balancer
- Google Cloud: External Application Load Balancer overview - https://cloud.google.com/load-balancing/docs/https
- Google Cloud: IPv6 for Application Load Balancers and proxy Network Load Balancers - https://cloud.google.com/load-balancing/docs/ipv6
- Google Cloud: Set up a global external Application Load Balancer with VM instance group backends - https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud: Use Google-managed SSL certificates - https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Terraform Registry: `google_compute_backend_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Registry: `google_compute_global_forwarding_rule` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Terraform Registry: `google_compute_target_https_proxy` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_target_https_proxy
- Terraform Registry: `google_compute_managed_ssl_certificate` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate

## Issues Found
- The introduction said the load balancer "automatically" supports both IPv4 and IPv6. I changed this to clarify that dual-stack frontends require two separate global forwarding rules, one IPv4 and one IPv6, which matches Google Cloud's IPv6 documentation.
- The backend service snippet was missing `load_balancing_scheme = "EXTERNAL_MANAGED"`. Without that field, Terraform defaults the backend service to the classic `EXTERNAL` scheme, which does not match a global external Application Load Balancer.
- The IPv4 and IPv6 forwarding rule snippets were also missing `load_balancing_scheme = "EXTERNAL_MANAGED"`. I added it so the Terraform resources actually create a global external Application Load Balancer instead of the classic variant.
- The IPv6 forwarding rule comment described a single IPv6 address. I corrected it to reflect Google Cloud's documented `/64` IPv6 allocation for IPv6 forwarding rules.
- The shell example used `${DOMAIN_NAME}` without defining it. I added a variable assignment so the command is valid as written.
- The testing step implied immediate HTTPS validation with a Google-managed certificate. I added a note that the certificate can remain in `PROVISIONING` until the public A and AAAA records point at the load balancer and the certificate becomes `ACTIVE`.

## Review Notes
- The post is accurate for an IPv6 frontend on a global external Application Load Balancer. The load balancer-to-backend connection still uses IPv4 by default unless you configure the backend service IP address selection policy for dual-stack backends.
- The snippets are partial examples and assume supporting resources already exist, including the managed instance group and Cloud DNS managed zone.
