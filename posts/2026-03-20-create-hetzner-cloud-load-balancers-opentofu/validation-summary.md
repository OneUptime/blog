# Validation Summary: How to Create Hetzner Cloud Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Hetzner Cloud Provider (`hetznercloud/hcloud`)
- Hetzner Cloud Load Balancers
- HCL (HashiCorp Configuration Language)
- TLS / Managed Certificates
- Hetzner Cloud Private Networks

## Sources Consulted
- Hetzner Cloud Terraform Provider documentation — `hcloud_load_balancer`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer.md
- Hetzner Cloud Terraform Provider documentation — `hcloud_load_balancer_service`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_service.md
- Hetzner Cloud Terraform Provider documentation — `hcloud_load_balancer_target`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_target.md
- Hetzner Cloud Terraform Provider documentation — `hcloud_load_balancer_network`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_network.md
- Hetzner Cloud Terraform Provider documentation — `hcloud_managed_certificate`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/managed_certificate.md

## Issues Found
- **Incorrect `label_selector` syntax in `hcloud_load_balancer_target`**: The original post used `label_selector` as a nested block with a `selector` attribute (`label_selector { selector = "role=web" }`). According to the official Hetzner Cloud Terraform provider documentation, `label_selector` is a top-level **string argument**, not a nested block. Changed to `label_selector = "role=web"`.

## Review Notes
- The `hcloud_load_balancer` resource correctly uses `name`, `load_balancer_type` (lb11/lb21/lb31 are valid Hetzner LB types), `location`, and `labels`.
- The `hcloud_load_balancer_service` `http` block correctly uses `certificates` (list of certificate IDs) and `redirect_http` arguments. Note: per the provider docs, `redirect_http` is only valid when `protocol = "https"` and `listen_port = 443` with a corresponding HTTP service on port 80 — the post's setup is consistent with this.
- The `health_check` block structure with the nested `http` block (`path`, `status_codes`) is correct.
- The `hcloud_load_balancer_target` resource correctly uses `type = "server"`, `server_id`, and `use_private_ip`.
- The `hcloud_managed_certificate` resource (with `name` and `domain_names`) is the correct resource name and arguments.
- The `hcloud_load_balancer_network` resource correctly uses `load_balancer_id`, `network_id`, and `ip`. Provider docs note that `subnet_id` is the preferred attachment method over `network_id`, but `network_id` is still supported.
- The post does not show the `algorithm` block on the load balancer (defaults to `round_robin`), which is acceptable for an introductory tutorial.
