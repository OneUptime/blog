# Validation Summary: How to Deploy Portainer on DigitalOcean Droplets - Part 3

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- DigitalOcean Droplets
- DigitalOcean Cloud Firewalls
- DigitalOcean Volumes Block Storage
- DigitalOcean Container Registry (DOCR)
- DigitalOcean Backups
- DigitalOcean Spaces
- `doctl`
- Docker Engine
- Portainer CE
- `s3cmd`

## Sources Consulted
- DigitalOcean Droplet pricing: https://www.digitalocean.com/pricing/droplets
- DigitalOcean backup pricing: https://www.digitalocean.com/pricing and https://www.digitalocean.com/products/backups
- `doctl compute droplet create`: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- `doctl compute firewall create`: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- `doctl compute firewall add-droplets`: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/add-droplets/
- `doctl compute volume create`: https://docs.digitalocean.com/reference/doctl/reference/compute/volume/create/
- `doctl compute volume-action attach`: https://docs.digitalocean.com/reference/doctl/reference/compute/volume-action/attach/
- DigitalOcean volume setup and mounting guidance: https://docs.digitalocean.com/products/volumes/how-to/create/ and https://docs.digitalocean.com/products/volumes/how-to/mount-unmount/
- DigitalOcean volume naming conventions: https://docs.digitalocean.com/products/volumes/details/naming-conventions/
- `doctl registry login`: https://docs.digitalocean.com/reference/doctl/reference/registry/login/
- DOCR usage and auth guidance: https://docs.digitalocean.com/products/container-registry/how-to/use-registry-docker-kubernetes/ and https://docs.digitalocean.com/products/container-registry/how-to/set-up-ci-cd/
- Portainer CE install with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer custom registry configuration: https://docs.portainer.io/admin/registries/add/custom
- Docker Engine install guidance for Ubuntu: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
- The Droplet pricing in the console instructions was outdated. The post said `$12/mo` for a `2GB RAM, 2 vCPU` Droplet, but current DigitalOcean pricing lists that plan at `$18/mo`. I updated the price to match the current pricing page.
- The firewall and Portainer deployment steps exposed port `9000` by default. Portainer’s current Linux install documentation uses `9443` for the UI and notes `9000` is only for legacy HTTP access. I removed `9000` from the firewall and `docker run` examples.
- The block storage instructions incorrectly formatted and mounted `/dev/sda`. DigitalOcean documents recommend using the stable `/dev/disk/by-id/scsi-0DO_Volume_<name>` path because `/dev/sd*` naming can vary and may point to the wrong device. I replaced the device path and mount options accordingly.
- The optional block storage step did not actually back Portainer’s data. The post created and mounted a volume, but Portainer still used a separate Docker named volume. I changed Portainer’s data mount to `/mnt/portainer-data` so the attached DigitalOcean volume is used when present.
- The Portainer image tag used `latest`. Current Portainer CE installation documentation uses the `lts` tag for the supported long-term release. I changed the example to `portainer/portainer-ce:lts`.
- The DOCR credential guidance described a nonexistent “API token username”. DigitalOcean’s official documentation describes token-based registry auth for third-party tools. I corrected the Portainer registry instructions to use a DigitalOcean API token in the username/password fields.
- The backup pricing note implied backups always cost `20%` of Droplet price. Current DigitalOcean pricing distinguishes weekly backups at `20%` and daily backups at `30%`. I updated the wording.
- The backup example archived the old named Docker volume instead of the data path used by the corrected Portainer deployment. I updated the backup commands to archive `/mnt/portainer-data` and upload that archive to Spaces.

## Review Notes
- The Docker convenience script used in the post is still functional, but Docker’s Ubuntu installation documentation recommends the `apt` repository method for long-lived production hosts. I left the script-based approach in place and only added the missing `curl` dependency plus `systemctl enable --now docker`.
- Portainer’s port `8000` is only needed for Edge Agent tunnel features. The post does not cover Edge Agents, so omitting `8000` is technically fine.
