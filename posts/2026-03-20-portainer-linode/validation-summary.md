# Validation Summary: How to Deploy Portainer on Linode/Akamai Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- Akamai Cloud Computing (Linode)
- Linode CLI
- Cloud Firewalls
- Reverse DNS

## Sources Consulted
- Portainer CE install with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Create a Linode in Cloud Manager: https://techdocs.akamai.com/cloud-computing/docs/create-a-compute-instance
- Add user data when deploying Linodes: https://techdocs.akamai.com/cloud-computing/docs/add-user-data-when-deploying-a-compute-instance
- Get started with the Linode CLI: https://techdocs.akamai.com/cloud-computing/docs/getting-started-with-the-linode-cli
- Create a firewall: https://techdocs.akamai.com/linode-api/reference/firewalls
- Create a firewall device: https://techdocs.akamai.com/linode-api/reference/post-firewall-device
- Update an IP address's RDNS for a Linode: https://techdocs.akamai.com/linode-api/reference/put-linode-ip
- Configure rDNS (reverse DNS) on a Linode: https://techdocs.akamai.com/cloud-computing/docs/configure-rdns-reverse-dns-on-a-compute-instance
- Enable backups: https://techdocs.akamai.com/linode-api/reference/post-enable-backups
- Shared CPU Linodes: https://techdocs.akamai.com/cloud-computing/docs/shared-cpu-compute-instances
- Akamai pricing page: https://www.linode.com/pricing/
- Local validation with `linode-cli` 5.67.0 `--help` output for `linodes create`, `firewalls create`, `firewalls device-create`, `linodes ip-update`, and `linodes backups-enable`

## Issues Found
- The post used Docker's `get.docker.com` convenience script for a production-style deployment. I replaced it with Docker's current apt-repository installation steps because Docker documents the convenience script as intended for testing and development environments.
- The Portainer container used the `portainer/portainer-ce:latest` tag. I changed both install commands to `portainer/portainer-ce:sts`, which matches Portainer's current documented Docker install command.
- The Linode CLI install command used `pip install linode-cli`. I updated it to `pip3 install linode-cli --upgrade`, which matches Akamai's current Linode CLI installation guidance.
- The firewall example opened ports `80` and `443` even though the post only deploys Portainer on `9443`. I removed those extra inbound rules to match the actual service being deployed.
- The firewall attach command used `linode-cli firewalls devices-create`, but the current CLI action is `device-create`. I corrected the command.
- The reverse DNS section omitted Linode's requirement to create a matching forward DNS A record first. I added that prerequisite to prevent the command from failing.
- The Cloud Manager UI wording referred to `Advanced Options → Add a StackScript` and implied the script could be pasted there directly. I updated it to the current `Add User Data` wording and clarified that StackScripts require saving the script first.

## Review Notes
- Ubuntu 22.04 LTS remains supported by Docker as of April 24, 2026, so the distro choice is still valid.
- The post still uses the moving `sts` Portainer tag, which matches current docs but is less reproducible than pinning a specific version.
