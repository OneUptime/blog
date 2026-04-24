# Validation Summary: How to Deploy Portainer on Oracle Cloud Free Tier - Part 3

## Status
validated

## Post Type
Guide

## Technologies Covered
- Oracle Cloud Infrastructure (OCI) Always Free resources
- OCI Ampere A1 Compute instances
- OCI VCN security lists and Ubuntu platform-image firewall rules
- Docker Engine on Ubuntu 22.04 ARM64
- Portainer CE on Docker
- OCI Block Volume attachments and `/etc/fstab`
- Docker Compose, Traefik, Nextcloud, and GitLab

## Sources Consulted
- Oracle Cloud Infrastructure Free Tier: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- Always Free Resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Platform Images: https://docs.oracle.com/en-us/iaas/Content/Compute/References/images.htm
- Known Issues for Compute: https://docs.oracle.com/en-us/iaas/Content/Compute/known-issues.htm
- Attaching a Block Volume to an Instance: https://docs.oracle.com/en-us/iaas/Content/Block/Tasks/attach-compute-volume-attachment.htm
- fstab Options for Block Volumes Using Consistent Device Paths: https://docs.oracle.com/en-us/iaas/Content/Block/References/fstaboptionsconsistentdevicepaths.htm
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall/
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Docker Registry manifest lists for `portainer/portainer-ce:sts` and `gitlab/gitlab-ce:latest` to confirm current `arm64` image availability

## Issues Found
- The post treated Portainer port `9000` as a standard current port. Current Portainer installation docs use `9443` for the web UI and describe `9000` as legacy HTTP only. I removed `9000` from the OCI ingress and `docker run` examples and changed the image reference to the documented `portainer/portainer-ce:sts` tag.
- The firewall section referred to “Oracle Linux's iptables” even though the tutorial deploys Ubuntu 22.04. I corrected the wording to OCI Ubuntu images and updated the firewall example to persist rules through `/etc/iptables/rules.v4`, which matches Oracle's Ubuntu guidance. I also made the `iptables-persistent` install noninteractive for a copy-paste-friendly command sequence.
- The Docker installation used Docker's convenience script. Docker documents that script as recommended for testing and development, while the current recommended Ubuntu installation path is Docker's official apt repository. I replaced the snippet with the official apt-based installation steps.
- The block volume example mounted `/dev/sdb` in `/etc/fstab`. Oracle recommends consistent device paths for reliable boot-time mounting on OCI. I updated the example to use `/dev/oracleoci/oraclevdb` with `_netdev,nofail`.
- The Always Free load balancer bullet was slightly imprecise. I clarified it as the Always Free flexible load balancer with `10 Mbps` minimum and maximum bandwidth.

## Review Notes
- The Compose example still uses floating tags such as `nextcloud:latest` and `gitlab/gitlab-ce:latest`. They are technically valid today, but pinning explicit versions would improve long-term reproducibility.
- I verified that the referenced Portainer and GitLab images currently publish `arm64` variants, which is necessary for OCI Ampere A1 instances.
