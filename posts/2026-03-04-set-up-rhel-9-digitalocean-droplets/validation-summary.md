# Validation Summary: How to Set Up RHEL for DigitalOcean Droplets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DigitalOcean Droplets
- DigitalOcean Custom Images
- DigitalOcean doctl CLI
- DigitalOcean Volumes Block Storage
- cloud-init
- qemu-img
- firewalld
- subscription-manager

## Sources Consulted
- DigitalOcean Custom Images upload documentation: https://docs.digitalocean.com/products/custom-images/how-to/upload/
- DigitalOcean Custom Images features and image requirements: https://docs.digitalocean.com/products/custom-images/details/features/
- DigitalOcean doctl image create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/image/create/
- DigitalOcean doctl image list reference: https://docs.digitalocean.com/reference/doctl/reference/compute/image/list/
- DigitalOcean doctl droplet create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- DigitalOcean doctl volume create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/volume/create/
- DigitalOcean Volumes create and mount documentation: https://docs.digitalocean.com/products/volumes/how-to/create/
- DigitalOcean Volumes mount and fstab documentation: https://docs.digitalocean.com/products/volumes/how-to/mount-unmount/
- DigitalOcean Volumes naming conventions: https://docs.digitalocean.com/products/volumes/details/naming-conventions/
- DigitalOcean Monitoring metrics agent documentation: https://docs.digitalocean.com/products/monitoring/how-to/install-metrics-agent/
- Red Hat Enterprise Linux 9 cloud-init documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_cloud-init_for_rhel_9/

## Issues Found
- The raw image example used a `.raw` filename. DigitalOcean documents raw custom images as `.img`, optionally compressed with gzip or bzip2, so the conversion, compression, and upload URL examples now use `rhel-9-cloud.img` and `rhel-9-cloud.img.gz`.
- The image listing command used `doctl compute image list --public=false`. The official doctl reference documents that private images are listed by default and `--public` is only needed to list public images, so the command now uses `doctl compute image list`.
- The Droplet creation command referenced `cloud-init.yaml` before the file was created. The cloud-init file creation now appears before `doctl compute droplet create`.

## Review Notes
- DigitalOcean custom images require supported image formats, cloud-init or an equivalent initialization system, and SSH configured on boot. RHEL KVM cloud images include cloud-init, but users should still confirm the custom image satisfies DigitalOcean's datasource and SSH requirements before upload.
- DigitalOcean's metrics agent documentation lists supported distributions as Ubuntu, CentOS, Debian, and Fedora. RHEL is not explicitly listed, so the install command may work because of RHEL compatibility with CentOS-style packages, but it is not documented as an officially supported monitoring-agent target.
