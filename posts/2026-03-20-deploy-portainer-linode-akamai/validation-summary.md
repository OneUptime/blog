# Validation Summary: How to Deploy Portainer on Linode (Akamai Cloud)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Linode (Akamai Cloud) provider
- Linode StackScripts
- Linode Cloud Firewall
- Docker Engine
- Portainer CE

## Sources Consulted
- Linode provider registry page: https://registry.terraform.io/providers/linode/linode/latest
- Linode provider docs, `linode_instance`: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/instance.md
- Linode provider docs, `linode_stackscript`: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/stackscript.md
- Linode provider docs, `linode_firewall`: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/firewall.md
- Linode API reference, create an instance: https://techdocs.akamai.com/linode-api/reference/post-linode-instance
- Linode API reference, create a firewall: https://techdocs.akamai.com/linode-api/reference/post-firewalls
- Linode API reference, StackScripts: https://techdocs.akamai.com/linode-api/reference/post-add-stack-script
- Linode API endpoints checked for current types, regions, and image IDs: https://api.linode.com/v4/linode/types , https://api.linode.com/v4/regions , https://api.linode.com/v4/images
- Portainer CE install docs: https://docs.portainer.io/start/install-ce/server/docker/linux.md
- Docker Engine on Ubuntu docs: https://docs.docker.com/installation/ubuntulinux/
- OpenTofu `pathexpand` function docs: https://opentofu.org/docs/language/functions/pathexpand/

## Issues Found
- The introduction said `user_data` bootstraps Docker and Portainer, but the example actually uses a Linode StackScript via `stackscript_id`. Updated the explanation to match the implementation.
- The provider pin was `~> 2.13`, which is outdated relative to the current Linode provider release line. Updated it to `~> 3.11`.
- The SSH key example used `file("~/.ssh/id_rsa.pub")`. `file()` does not expand `~`, so this can fail as written. Updated it to `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The StackScript heredoc was written in a way that could prevent the script from starting with a valid shebang when copied with space indentation. Rewrote the heredoc so `#!/bin/bash` starts at the beginning of the script.
- The bootstrap script used `curl` without ensuring it was installed. Added `ca-certificates` and `curl` installation before fetching Docker.
- The Portainer container used `portainer/portainer-ce:latest`, which is not the current recommended install tag in the official CE install docs. Updated it to `portainer/portainer-ce:sts`.
- The firewall rule used `ipv4 = [var.admin_ip]`, but Linode firewall IPv4 entries must be CIDR-formatted. Updated it to append `/32` for a single admin IPv4 address.

## Review Notes
- The current Portainer CE install page uses the `sts` track. Pinning a supported track is safer than using `latest`, but Portainer also publishes other supported tracks such as `lts` in other documentation contexts.
- Docker still publishes the `get.docker.com` convenience installer, but Docker documents it as intended for development and testing rather than production-standard package management.
- The firewall example now assumes `var.admin_ip` is a single IPv4 address such as `203.0.113.10`. If the input variable is already a CIDR, the expression should be adjusted accordingly.
