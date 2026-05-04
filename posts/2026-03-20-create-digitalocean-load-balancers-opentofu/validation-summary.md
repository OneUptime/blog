# Validation Summary: How to Create DigitalOcean Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- DigitalOcean Terraform Provider
- DigitalOcean Load Balancers
- DigitalOcean Certificates (Let's Encrypt)
- DigitalOcean VPC
- DigitalOcean Droplets (via tags)

## Sources Consulted
- DigitalOcean Terraform Provider — `digitalocean_loadbalancer` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/loadbalancer.md
- DigitalOcean Terraform Provider — `digitalocean_certificate` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/certificate.md
- Terraform Registry — DigitalOcean provider documentation: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs

## Issues Found
No technical issues found.

All resource arguments and nested blocks were verified against the official DigitalOcean Terraform provider documentation:

- `digitalocean_loadbalancer`: `name`, `region`, `droplet_tag`, `vpc_uuid`, `redirect_http_to_https` — all valid.
- `forwarding_rule` block: `entry_port`, `entry_protocol`, `target_port`, `target_protocol`, `certificate_name` — all valid. (`certificate_name` is the preferred argument for Let's Encrypt certificates because it survives certificate renewals; `certificate_id` is deprecated in current provider versions.)
- `healthcheck` block: `port`, `protocol`, `path`, `check_interval_seconds`, `response_timeout_seconds`, `unhealthy_threshold`, `healthy_threshold` — all valid.
- `sticky_sessions` block: `type = "cookies"`, `cookie_name`, `cookie_ttl_seconds` — all valid (`"cookies"` and `"none"` are the supported type values).
- `digitalocean_loadbalancer.ip` output attribute — valid.
- `digitalocean_certificate` with `type = "lets_encrypt"` and `domains` — valid.
- `digitalocean_vpc` with `name`, `region`, `ip_range` — valid.

## Review Notes
- The post uses `certificate_name` rather than `certificate_id` for the Let's Encrypt certificate reference. This is correct and is the recommended approach for Let's Encrypt-issued certificates because the certificate ID changes when DigitalOcean renews the cert, but the name remains stable.
- The `algorithm` argument has been deprecated in newer provider versions; the post correctly does not use it.
- The post does not pin a specific provider version. Users following the tutorial may want to add a `terraform { required_providers { digitalocean = { source = "digitalocean/digitalocean", version = "~> 2.0" } } }` block in real-world usage, though this is a stylistic note rather than a technical correctness issue.
- The `nyc3` region and example IP range `10.10.0.0/16` are reasonable demonstration values.
