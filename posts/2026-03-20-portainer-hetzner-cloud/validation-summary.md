# Validation Summary: How to Deploy Portainer on Hetzner Cloud - Part 3

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Hetzner Cloud
- Hetzner Cloud CLI (`hcloud`)
- Docker Engine on Ubuntu 24.04
- Portainer CE
- Hetzner Volumes
- Hetzner Floating IPs
- Hetzner Backups and Snapshots
- Netplan

## Sources Consulted
- Hetzner Cloud CLI setup tutorial: https://github.com/hetznercloud/cli/blob/main/docs/tutorials/setup-hcloud-cli.md
- Hetzner Cloud CLI server creation tutorial: https://github.com/hetznercloud/cli/blob/main/docs/tutorials/create-a-server.md
- Hetzner Cloud CLI manual, `hcloud server create`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_server_create.md
- Hetzner Cloud CLI manual, `hcloud firewall add-rule`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_firewall_add-rule.md
- Hetzner Cloud CLI manual, `hcloud firewall apply-to-resource`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_firewall_apply-to-resource.md
- Hetzner Cloud CLI manual, `hcloud volume create`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_volume_create.md
- Hetzner Docs, Volumes overview: https://docs.hetzner.com/cloud/volumes/overview/
- Hetzner Docs, Volumes FAQ: https://docs.hetzner.com/cloud/volumes/faq/
- Hetzner Cloud CLI manual, `hcloud floating-ip create`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_floating-ip_create.md
- Hetzner Cloud CLI manual, `hcloud floating-ip assign`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_floating-ip_assign.md
- Hetzner Docs, Floating IP overview: https://docs.hetzner.com/cloud/floating-ips/overview/
- Hetzner Docs, Floating IP persistent configuration: https://docs.hetzner.com/cloud/floating-ips/persistent-configuration/
- Hetzner Docs, Servers overview: https://docs.hetzner.com/cloud/servers/overview/
- Hetzner Docs, Backups/Snapshots overview: https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/
- Hetzner Cloud CLI manual, `hcloud server enable-backup`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_server_enable-backup.md
- Hetzner Cloud CLI manual, `hcloud server create-image`: https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_server_create-image.md
- Docker Docs, Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Portainer Docs, Install Portainer CE with Docker on Linux (2.33 LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux

## Issues Found
- The Cloud Console URL was outdated. I changed `console.hetzner.cloud` to `console.hetzner.com` to match current Hetzner documentation.
- The `hcloud server create` example used `--ssh-key "$(cat ~/.ssh/id_rsa.pub)"`, but the CLI expects an SSH key name or ID. I added an explicit `hcloud ssh-key create` step and changed server creation to use the uploaded key name.
- The firewall section treated port `9000` like a standard required Portainer port. I kept it, but marked it as optional legacy HTTP access and left `9443` as the primary UI port per current Portainer guidance.
- The Docker install step used the convenience script. I replaced it with Docker's official Ubuntu `apt` repository installation flow, which is the documented production installation path.
- The volume section used wildcard mount paths and a placeholder `fstab` entry that would not work as written. I changed it to use Hetzner's supported `--automount` option and the documented `/mnt/HC_Volume_<volume-id>` mount path.
- The Portainer deployment used `portainer/portainer-ce:latest`. I changed it to the current documented `portainer/portainer-ce:lts` tag and mounted `/data` onto the Hetzner volume path directly.
- The floating IP section used `ip addr add` only, which is temporary. I replaced it with a persistent Ubuntu netplan configuration based on Hetzner's Floating IP documentation.
- The backup section incorrectly said Hetzner backups store "7 snapshots". I corrected this to 7 backup slots per server and clarified that snapshots are separate.
- The manual snapshot command was incomplete. I added the required `--type snapshot` flag to `hcloud server create-image`.
- The post implied that enabling backups would protect all Portainer data. I corrected this by stating that Hetzner server backups and snapshots do not include attached Volumes.

## Review Notes
- The CX22 sizing and approximate pricing language is reasonable, but exact cloud pricing can vary over time and by VAT/region.
- The guide now treats port `9443` as the primary Portainer entry point. Port `9000` remains available only for legacy HTTP use cases.
- Because Portainer data is stored on an attached Hetzner Volume in this guide, a separate in-guest backup strategy is still needed for `/mnt/HC_Volume_<volume-id>/portainer`.
