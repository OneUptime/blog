# Validation Summary: How to Deploy Portainer on Vultr Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Vultr Cloud Compute
- Vultr Terraform/OpenTofu provider
- Terraform/OpenTofu HCL
- Vultr startup scripts
- Vultr firewall groups and firewall rules
- Docker Engine
- Portainer CE
- SSH public keys

## Sources Consulted
- Vultr Terraform provider overview: https://docs.vultr.com/reference/terraform
- Vultr instance resource reference: https://docs.vultr.com/reference/terraform/resources/instance
- Vultr firewall rule resource reference: https://docs.vultr.com/reference/terraform/resources/firewall_rule
- Vultr startup script provisioning guide: https://docs.vultr.com/products/orchestration/startup-scripts/provisioning
- Vultr Cloud Compute pricing and regions: https://www.vultr.com/pricing/ and https://www.vultr.com/products/cloud-compute/
- Terraform `file` function: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `pathexpand` function: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Vultr provider release metadata: https://registry.terraform.io/v1/providers/vultr/vultr
- Portainer CE install on Docker (LTS docs): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Docker Engine installation guidance for Ubuntu: https://docs.docker.com/installation/ubuntulinux/

## Issues Found
- The `vultr_instance` example used `startup_id`, but the current Vultr provider uses `script_id` for attaching startup scripts. I changed the attribute so the startup script is actually associated with the instance.
- The SSH key example used `file("~/.ssh/id_rsa.pub")`. Terraform's `file()` function does not expand `~`, so I changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))` to make the path resolve correctly.
- The provider version constraint was pinned to `~> 2.19`, which is behind the current provider release available on 2026-05-01. I updated it to `~> 2.31`.
- The startup script used `curl` without installing it first and referenced `portainer/portainer-ce:latest`. I added `ca-certificates` and `curl`, and changed the image tag to `portainer/portainer-ce:lts` to align with current supported Portainer guidance.

## Review Notes
- The hard-coded `region = "ewr"`, `plan = "vc2-1c-1gb"`, and `os_id = 1743` values were valid at review time, but Vultr catalog values can change over time. Using `vultr_region`, `vultr_plan`, and `vultr_os` data sources would reduce future drift.
- The firewall example intentionally restricts inbound access to `9443/tcp`. That is enough for Portainer's HTTPS UI, but SSH access would also require a separate `22/tcp` rule if the attached SSH key is meant to be used interactively.
- Docker's `get.docker.com` convenience script remains supported, but Docker recommends repository-based installation for long-lived production systems.
