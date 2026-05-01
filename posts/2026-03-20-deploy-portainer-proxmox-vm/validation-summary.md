# Validation Summary: How to Deploy Portainer on a Proxmox VM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox VE
- `qm` CLI
- Ubuntu 22.04 cloud images
- cloud-init
- Docker Engine
- Portainer CE

## Sources Consulted
- Proxmox VE `qm` manual: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox VE Cloud-Init Support: https://pve.proxmox.com/wiki/Cloud-Init_Support
- Proxmox VE Qemu Guest Agent: https://pve.proxmox.com/wiki/Qemu-guest-agent
- Docker Docs, Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Portainer Docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Docs, Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- cloud-init CLI reference: https://cloudinit.readthedocs.io/en/latest/reference/cli.html

## Issues Found
- The post used `qm agent 200 network-get-interfaces` before the guest agent was installed in the VM and enabled in Proxmox. I removed that step and changed the SSH instruction to use the DHCP-assigned address instead, because Proxmox documents `qm agent` as depending on a running guest agent.
- The Docker convenience script was piped to `sh` without root privileges, which would fail for a normal `ubuntu` user. I changed it to `curl -fsSL https://get.docker.com | sudo sh` to match Docker's documented usage.
- The next commands assumed the `ubuntu` user could run `docker` immediately after `usermod -aG docker ubuntu`, but group membership does not apply to the current session. I changed the Portainer deployment commands to `sudo docker ...` so the snippet works as written.
- The Portainer run command exposed HTTP port `9000` by default and used the floating `latest` image tag. I updated it to use HTTPS on `9443` and the official `portainer/portainer-ce:lts` tag, which aligns with current Portainer guidance.
- The template workflow converted the VM to a template without cleaning cloud-init state first, which can leave stale instance data in clones. I added `cloud-init clean --machine-id` and a shutdown step before `qm template 200`.
- The autostart command targeted VM `200` after it had been converted into a template. I changed `--onboot 1` to target the cloned runnable VM (`201`) instead, because Proxmox templates are read-only and cannot be started.
- The introduction said the guide uses Terraform/OpenTofu or the Proxmox CLI, even though only the CLI flow is shown in the post. I reworded that line to clarify that the article demonstrates the CLI workflow.

## Review Notes
- `qm importdisk` is still valid in current Proxmox documentation, though the docs also show the newer `qm set ... import-from=...` workflow for cloud images.
- Docker still supports the `get.docker.com` convenience script, but its Ubuntu installation guide says it is intended for testing and development environments; the apt repository method remains the preferred long-term installation path.
