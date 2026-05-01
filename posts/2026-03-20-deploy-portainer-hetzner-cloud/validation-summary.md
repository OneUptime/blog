# Validation Summary: How to Deploy Portainer on Hetzner Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Hetzner Cloud
- OpenTofu / Terraform HCL
- `hetznercloud/hcloud` provider
- Docker Engine
- Portainer CE
- cloud-init user data

## Sources Consulted
- Hetzner Cloud Terraform provider `hcloud_server` resource docs: https://registry.terraform.io/providers/hetznercloud/hcloud/1.60.1/docs/resources/server
- Hetzner Cloud Terraform provider `hcloud_firewall` resource docs: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/firewall
- Hetzner Cloud Terraform provider `hcloud_ssh_key` resource docs: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/ssh_key
- Hetzner Docs, Creating a Server: https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/
- Hetzner Docs, Locations: https://docs.hetzner.com/cloud/general/locations/
- Hetzner Docs, Server Overview: https://docs.hetzner.com/cloud/servers/overview
- Hetzner Docs, Price Adjustment notice: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- Docker Docs, Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Portainer Docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Docs, Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites

## Issues Found
- The post pinned the `hetznercloud/hcloud` provider to `~> 1.45`, which was outdated relative to the current official provider docs. I updated it to `~> 1.60` to align the example with the current documented provider series.
- The `cpx11` inline price comment was stale. Hetzner pricing changed, and current Hetzner pricing also treats public IPv4 separately. I removed the hard-coded monthly price and kept the stable hardware details (`2 vCPU, 2 GB RAM`).
- The Portainer container used `portainer/portainer-ce:latest`. Portainer's current Docker installation docs use the `portainer/portainer-ce:lts` image tag. I updated the command accordingly and reformatted the `docker run` command for correctness and clarity.

## Review Notes
- The post is still technically valid using only port `9443` for Portainer. Portainer documents port `8000` as optional and only required for Edge compute features with Edge agents.
- The Docker convenience script at `https://get.docker.com` is an official Docker installation path, but Docker documents it as mainly suited to testing and development rather than production. I left it unchanged because it is valid for automated bootstrap scripts and the post did not claim it was the recommended production install method.
