# Validation Summary: How to Configure Cloud CDN on GCP with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud Platform (GCP)
- Cloud CDN
- Global external Application Load Balancer
- Cloud Storage backend buckets
- Google-managed SSL certificates

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- Cloud CDN setup overview: https://cloud.google.com/cdn/docs/using-cdn
- Set up a backend bucket for Cloud CDN: https://cloud.google.com/cdn/docs/setting-up-cdn-with-bucket
- Cloud CDN caching behavior and cache modes: https://cloud.google.com/cdn/docs/caching
- Set up a global external Application Load Balancer with Cloud Storage buckets: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-buckets
- Set up HTTP-to-HTTPS redirect for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/setting-up-global-http-https-redirect
- Use Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google provider `google_compute_backend_bucket` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_bucket
- Google provider `google_compute_url_map` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map
- Google provider `google_compute_global_forwarding_rule` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Google provider `google_compute_managed_ssl_certificate` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_managed_ssl_certificate

## Issues Found
- The HTTP redirect forwarding rule omitted `load_balancing_scheme = "EXTERNAL_MANAGED"`. The Google provider defaults this field to `EXTERNAL`, which would not match the rest of the post's global external Application Load Balancer configuration. I added `load_balancing_scheme = "EXTERNAL_MANAGED"` and made `ip_protocol = "TCP"` explicit for clarity.
- The URL map referenced `google_compute_backend_service.api.id`, but that resource was not defined anywhere in the post. I changed the example to use `var.api_backend_service_id` so the snippet is an explicit URL-map fragment that accepts an existing backend service ID.
- The Mermaid diagram routed `/static/*` to the backend bucket, but the HCL routes all non-`/api/*` traffic to the backend bucket via the default service. I updated the diagram to show `default` routing so it matches the code.
- The CDN policy comments overstated what `CACHE_ALL_STATIC` and `serve_while_stale` do. I corrected the comments to reflect the official behavior: query-string handling is controlled by cache-key policy, and `serve_while_stale` serves stale cached content during revalidation or cache refresh errors.
- The best-practices note for `serve_while_stale` claimed it "eliminates cache miss latency," which is too broad. I changed it to say it can reduce user-visible latency when stale content is acceptable.
- The post pinned the Google provider to `~> 5.10`, which is outdated relative to the current 7.x provider documentation. I updated the constraint to `~> 7.0` while keeping the same resource model and arguments.

## Review Notes
- Google-managed SSL certificates do not become active immediately. They remain in a provisioning state until the domain's public DNS A and/or AAAA records point at the load balancer IP.
- For public Cloud Storage origins behind a backend bucket, making objects publicly readable is still a valid documented setup, but some organizations block this with org policies such as Public Access Prevention or domain-restricted sharing.
- The post assumes supporting variables such as `var.project_id`, `var.region`, `var.project_name`, `var.domain_name`, and `var.api_backend_service_id` are defined elsewhere in the OpenTofu configuration.
