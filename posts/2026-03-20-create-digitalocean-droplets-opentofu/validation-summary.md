# Validation Summary: How to Create DigitalOcean Droplets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- DigitalOcean Terraform/OpenTofu provider (`digitalocean/digitalocean` v2.x)
- DigitalOcean Droplets, SSH Keys, VPCs
- HCL (HashiCorp Configuration Language)
- Cloud-init / user data
- Ubuntu 22.04 LTS

## Sources Consulted
- DigitalOcean provider registry: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs
- `digitalocean_droplet` resource docs: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/droplet
- `digitalocean_ssh_key` resource docs: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/ssh_key
- `digitalocean_vpc` resource docs: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/vpc
- DigitalOcean slugs reference (regions, sizes, images)

## Issues Found
- **Backup default frequency** (line 152): The original comment stated `backups = true` "Enables weekly automated backups". Per current provider docs, when `backups = true` is set without a `backup_policy` block, the backup plan defaults to **daily**, not weekly. Updated the comment to: `Enables automated backups (defaults to daily; use backup_policy to customize)`.

## Review Notes
- All resource arguments (`name`, `region`, `size`, `image`, `ssh_keys`, `tags`, `user_data`, `vpc_uuid`, `backups`, `monitoring`, `ipv6`) are valid for `digitalocean_droplet`.
- Region (`nyc3`, `sfo3`), size (`s-1vcpu-1gb`, `s-2vcpu-2gb`, `s-4vcpu-8gb`), and image (`ubuntu-22-04-x64`) slugs match documented format and are commonly used. Slug validity is enforced server-side at apply time.
- `digitalocean_ssh_key.fingerprint` is the correct attribute to feed into the droplet's `ssh_keys` list (the docs themselves use this pattern).
- `digitalocean_vpc.ip_range` is technically optional (DigitalOcean will auto-assign one) — using an explicit range as the post does is good practice, no change needed.
- `monitoring = true` installs the DO monitoring agent (free). For actual alerting, users would additionally need `digitalocean_monitor_alert` resources — out of scope for this post but worth noting for future expansion.
- The `terraform { required_providers { ... } }` block is correctly used; OpenTofu accepts this block name for compatibility with existing Terraform configurations.
- The post correctly recommends storing the API token as a sensitive variable or env var rather than hardcoding it.
