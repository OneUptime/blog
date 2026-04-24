# Validation Summary: How to Deploy Portainer on DigitalOcean Droplets - Part 2

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- DigitalOcean Droplets
- DigitalOcean Marketplace 1-Click Apps
- DigitalOcean Cloud Firewalls
- DigitalOcean DNS / Domains
- `doctl`
- `cloud-init`

## Sources Consulted
- DigitalOcean: How to Provide User Data During Droplet Creation - https://docs.digitalocean.com/products/droplets/how-to/provide-user-data/
- DigitalOcean: How to Connect to Droplets with SSH - https://docs.digitalocean.com/products/droplets/how-to/connect-with-ssh/
- DigitalOcean: How to Install and Configure doctl - https://docs.digitalocean.com/docs/apis-clis/doctl/how-to/install
- DigitalOcean: `doctl compute droplet create` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- DigitalOcean: `doctl compute droplet get` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/get/
- DigitalOcean: Docker Marketplace image docs - https://docs.digitalocean.com/products/marketplace/catalog/docker/
- DigitalOcean: `doctl compute firewall create` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- DigitalOcean: How to Create Firewalls - https://docs.digitalocean.com/products/networking/firewalls/how-to/create/
- DigitalOcean: `doctl compute firewall add-droplets` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/add-droplets/
- DigitalOcean: `doctl compute domain create` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/domain/create/
- DigitalOcean: `doctl compute domain records create` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/domain/records/create/
- DigitalOcean: `doctl compute droplet-action enable-backups` reference - https://docs.digitalocean.com/reference/doctl/reference/compute/droplet-action/enable-backups/
- DigitalOcean: Backups Pricing - https://docs.digitalocean.com/products/backups/details/pricing/
- DigitalOcean: Droplet Pricing - https://docs.digitalocean.com/products/droplets/details/pricing/
- Portainer: Install Portainer CE with Docker on Linux - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer: Lifecycle policy - https://docs.portainer.io/sts/start/lifecycle
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/installation/ubuntulinux/
- cloud-init examples - https://cloudinit.readthedocs.io/en/latest/reference/yaml_examples/boot_cmds.html

## Issues Found
- The cloud-init example attempted `usermod -aG docker ubuntu`, but DigitalOcean documents `root` as the default initial user on most Ubuntu Droplets. I removed that command because the referenced `ubuntu` user is not created by default.
- The `doctl` install command used `snap install doctl` without `sudo`. DigitalOcean's installation docs use `sudo snap install doctl`, so I corrected it.
- The Option 2 comment said the Droplet was created with Docker pre-configured, but the command actually provisions a standard Ubuntu image and relies on `--user-data-file` to install Docker. I corrected the description to match the command.
- The Marketplace section claimed a minimum size of 2 GB RAM / 1 vCPU. I removed that claim because it is not documented on the official Docker Marketplace page and it conflicted with the post's own later sizing guidance.
- The firewall example opened ports `80` and `443` even though the tutorial only deploys Portainer on `9443` and does not configure a reverse proxy. I narrowed the inbound rules to the ports actually used by the guide: `22` and `9443`.
- The domain section comment said `doctl compute domain create` created a domain record. That command creates the domain itself, so I corrected the comment.
- The backup section claimed to enable weekly backups at 20% of Droplet cost, but the command used a Droplet name where the reference requires a Droplet ID and did not set a weekly backup policy. I updated it to use the Droplet ID and explicit weekly backup policy flags.
- The introductory sentence tied personal use to a specific `$6/month` Droplet, which conflicted with the post's later recommendation table. I generalized that sentence to avoid a pricing-specific inconsistency.

## Review Notes
- The Portainer container commands use `portainer/portainer-ce:latest`. This currently resolves on Docker Hub and should work, but Portainer's installation docs are organized around `lts` and `sts` tags. Pinning one of those streams would make upgrades more predictable in a future revision.
- The Docker convenience script from `get.docker.com` is still documented by Docker and is valid for automated provisioning, but Docker explicitly notes that it is not the recommended path for production environments.
