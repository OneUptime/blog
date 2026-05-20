# Validation Summary: How to Use cloud-init to Automate Ubuntu Server Setup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- cloud-init
- cloud-config YAML
- AWS EC2 user data
- Hetzner Cloud CLI and Terraform provider
- DigitalOcean doctl
- NoCloud datasource
- NodeSource Node.js packages
- Nginx, UFW, fail2ban, systemd
- Terraform cloudinit provider

## Sources Consulted
- cloud-init user-data formats and headers: https://docs.cloud-init.io/en/latest/explanation/format/
- cloud-init boot stages: https://docs.cloud-init.io/en/latest/explanation/boot.html
- cloud-init runcmd examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/boot_cmds.html
- cloud-init write_files examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- cloud-init package update/install examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/package_update_upgrade.html
- cloud-init final_message examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/final_message.html
- cloud-init NoCloud datasource: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- cloud-init user-data validation: https://docs.cloud-init.io/en/latest/howto/debug_user_data.html
- AWS CLI run-instances reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- DigitalOcean doctl droplet create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- Terraform cloudinit_config documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Hetzner Cloud Terraform hcloud_server resource: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/server
- NodeSource Node.js 22.x setup script: https://github.com/nodesource/distributions/blob/master/scripts/deb/setup_22.x

## Issues Found
- The introductory `#cloud-config` example was a header-only/comment-only document, which `cloud-init schema` rejects because cloud-config must parse as a YAML mapping. Added `hostname: my-server` so the snippet remains minimal but validates.
- The `runcmd` example enabled and started `fail2ban` without installing the `fail2ban` package in that same snippet. Added `fail2ban` to the package list so those commands can succeed on a fresh Ubuntu server.
- The complete application server example used `Setup took $UPTIME seconds.` in `final_message`, but cloud-init documents the token as lowercase `$uptime`. Changed it to `Setup took $uptime.`

## Review Notes
- All cloud-config YAML snippets in the post were checked with `cloud-init schema --config-file` using local cloud-init 25.2 after the fixes.
- The Terraform example relies on the `cloudinit_config` data source; in current Terraform usage this requires the cloudinit provider to be available in the surrounding configuration, which is outside the scope of the snippet shown.
