# Validation Summary: How to Create GCP External HTTP(S) Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Load Balancing
- Global external Application Load Balancer
- Google Cloud backend services
- Google Cloud backend buckets
- Google-managed SSL certificates
- OpenTofu
- HCL

## Sources Consulted
- Google Cloud Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/application-load-balancer
- Google Cloud External Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/https
- Google Cloud URL maps overview: https://cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud HTTP-to-HTTPS redirect for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/setting-up-global-http-https-redirect
- Google Cloud Use Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud external Application Load Balancer with backend buckets: https://cloud.google.com/load-balancing/docs/https/ext-load-balancer-backend-buckets
- Google provider `google_compute_backend_service` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Google provider `google_compute_url_map` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map
- Google provider `google_compute_global_forwarding_rule` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Google provider `google_compute_managed_ssl_certificate` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate

## Issues Found
- The overview and summary described the setup generically as an external HTTP(S) load balancer, but the configuration uses `load_balancing_scheme = "EXTERNAL_MANAGED"`, which is the global external Application Load Balancer mode. I corrected the wording so the explanation matches the resources being provisioned.
- The URL map referenced `google_compute_backend_service.api_backend.id`, but no `api_backend` resource existed in the post. I added a valid `google_compute_backend_service "api_backend"` resource so the path-based API routing example is internally consistent.
- The HTTP target proxy referenced `google_compute_url_map.https_redirect_map.id`, but that redirect URL map was not defined. I added a `google_compute_url_map "https_redirect_map"` resource with `default_url_redirect` configured for HTTPS redirects and a `301`-equivalent response code.
- The HTTP forwarding rule omitted `load_balancing_scheme = "EXTERNAL_MANAGED"`, which is required for the global external Application Load Balancer configuration shown elsewhere in the post. I added the missing attribute and made the frontend protocol explicit with `ip_protocol = "TCP"`.

## Review Notes
- Google-managed certificates are valid for this setup, but they do not become active until the certificate is attached to the target HTTPS proxy and public DNS `A` and `AAAA` records for the configured hostnames point at the load balancer IP. Provisioning can take time after deployment.
- The snippets focus on load balancer resources and still assume the backing managed instance group and Cloud Storage bucket already exist.
