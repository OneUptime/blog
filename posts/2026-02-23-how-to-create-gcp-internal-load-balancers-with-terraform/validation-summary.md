# Validation Summary: How to Create GCP Internal Load Balancers with Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (hashicorp/google provider ~> 5.0)
- Google Cloud Platform (GCP)
- GCP Internal TCP/UDP Load Balancer (Layer 4, `INTERNAL` scheme)
- GCP Internal HTTP(S) Load Balancer (Layer 7, `INTERNAL_MANAGED` scheme, Envoy-based)
- GCP VPC networking (custom VPC, subnetworks, proxy-only subnet)
- GCP Compute Engine (instance templates, regional managed instance groups)
- GCP Firewall rules
- GCP Health checks (TCP and HTTP)
- GCP URL maps, target HTTP/HTTPS proxies, regional SSL certificates

## Sources Consulted
- [Terraform `google_compute_instance_template`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template) — confirmed `region` is a valid optional argument used as a hint for regional subnet references
- [Terraform `google_compute_region_backend_service`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_backend_service) — verified `connection_draining_timeout_sec`, `load_balancing_scheme`, `balancing_mode` arguments
- [Terraform `google_compute_subnetwork`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork) — verified `purpose = "REGIONAL_MANAGED_PROXY"` and `role = "ACTIVE"` are valid
- [Terraform `google_compute_forwarding_rule`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule) — verified `allow_global_access`, `port_range`, `ports`, `target`, `backend_service` arguments
- [GCP Internal Application Load Balancer overview](https://cloud.google.com/load-balancing/docs/l7-internal) — verified architecture (proxy-only subnet, URL map, target proxy, forwarding rule)
- [GCP Health checks concepts](https://cloud.google.com/load-balancing/docs/health-check-concepts) — confirmed health check probe ranges 130.211.0.0/22 and 35.191.0.0/16
- [GCP Terraform examples for regional internal Application LB](https://cloud.google.com/load-balancing/docs/l7-internal/int-https-lb-tf-examples)
- [Terraform `google_compute_region_ssl_certificate`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_ssl_certificate)

## Issues Found
No technical issues found.

The following items were specifically verified and confirmed correct:
- `region` argument on `google_compute_instance_template` is valid (it acts as a region hint for regional subnet references; the template itself remains a global resource).
- Proxy-only subnet configuration (`purpose = "REGIONAL_MANAGED_PROXY"`, `role = "ACTIVE"`, `/24` CIDR which satisfies the `/26` minimum) is correct.
- Google health check probe ranges (130.211.0.0/22 and 35.191.0.0/16) are the correct source ranges for both L4 (`INTERNAL`) and L7 (`INTERNAL_MANAGED`) health checks.
- Regional resources (`google_compute_region_url_map`, `google_compute_region_target_http_proxy`, `google_compute_region_target_https_proxy`, `google_compute_region_ssl_certificate`) are the correct pairings for `INTERNAL_MANAGED` regional forwarding rules.
- `balancing_mode = "CONNECTION"` for L4 TCP backend and `balancing_mode = "UTILIZATION"` for L7 HTTP backend are valid.
- `session_affinity = "CLIENT_IP"` is a valid value.
- `allow_global_access = true` is correctly available on internal forwarding rules.
- The two firewall rules (Google health check ranges + proxy-only subnet CIDR) properly cover both health-check probing and L7 data-plane traffic from Envoy proxies to backends.

## Review Notes
- The post correctly notes Google-managed SSL certificates are not supported on regional internal ALBs by using the self-managed `google_compute_region_ssl_certificate` (loading key/cert from local files). For production, users should consider Certificate Manager as an alternative.
- The URL map example sets `default_service` AND a `path_rule` for `/api/*` that points to the same backend service; this is technically valid but redundant — it primarily illustrates the structure of path-based routing. Future readers may want to extend it with a different backend service for the path rule to show meaningful routing.
- The startup script writes to `/var/www/html/index.html` immediately after installing nginx; this works on Debian 12 where the default nginx document root is `/var/www/html`.
- The post pins `hashicorp/google` provider to `~> 5.0`. As of the review date (2026-05-24), provider 5.x is no longer the latest major (6.x is generally available), but the 5.x examples shown remain syntactically valid and the resources/arguments used are still supported in newer versions. Readers may wish to upgrade the pin when adopting.
