# Validation Summary: How to Install Rancher on AlmaLinux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- AlmaLinux 9
- Docker Engine
- K3s
- SELinux
- firewalld

## Sources Consulted
- Rancher Docs: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher Docs: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Docs: Port Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher Docs: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher Docs: Advanced Options for Docker Installs - https://ranchermanager.docs.rancher.com/reference-guides/single-node-rancher-in-docker/advanced-options
- Rancher Docs: About k3s-selinux - https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/selinux-rpm/about-k3s-selinux
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: containerd image store with Docker Engine - https://docs.docker.com/engine/storage/containerd/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- K3s Docs: Requirements - https://docs.k3s.io/installation/requirements
- Red Hat Docs: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The post presented Rancher-in-Docker as a normal installation path. Rancher’s official documentation states that the single-node Docker method is for development and testing only, so the description, introduction, and conclusion were corrected to reflect that scope.
- The post instructed readers to put SELinux into permissive mode. That is not a standard requirement in the current Docker or Rancher guidance, so the step was changed to keep SELinux enabled and the Rancher bind mount was updated to use `:Z` so it works correctly on SELinux-enforcing AlmaLinux hosts.
- The Docker installation steps used older package guidance. `yum-utils`, `device-mapper-persistent-data`, and `lvm2` were replaced with the current `dnf-plugins-core`-based repository setup from Docker’s RHEL documentation, the repository URL was updated to the RHEL Docker CE repo, and the Docker service enable/start command was aligned with the current documented `systemctl enable --now docker` form.
- The post removed `buildah` and `containers-common` as if they were required conflicts. Docker’s current RHEL installation guidance specifically calls out `podman` and `runc`, so the removal step was narrowed accordingly.
- The firewalld step was inaccurate for a Rancher Docker install on a host that runs the local K3s cluster. Rancher and K3s both document disabling `firewalld` because it can interfere with Kubernetes networking, so the port-opening and masquerade rules were replaced with `systemctl disable --now firewalld`, with a note to allow ports 80 and 443 in any upstream cloud firewall or security group.
- The Docker daemon configuration forced the legacy `overlay2` storage driver. Current Docker Engine documentation notes that fresh Docker 29+ installs use the containerd image store by default, so the explicit storage-driver setting was removed while keeping log rotation in place.
- The troubleshooting section assumed `sealert` was always installed and that `firewalld` would remain active. The SELinux audit command was updated to the broader filter documented by Red Hat, `sealert` was marked as conditional on `setroubleshoot-server`, and the firewall check was changed to `systemctl status firewalld`.
- The first-login UI step said users must accept terms and conditions. That is not documented as a stable, required step in the current Rancher install flow, so it was generalized to completing any remaining first-login prompts.

## Review Notes
- Docker does not publish AlmaLinux-specific Docker Engine installation instructions. The updated guide follows Docker’s official RHEL instructions because AlmaLinux 9 is RHEL-compatible; that is a compatibility-based choice rather than an AlmaLinux-specific Docker support statement.
- The retained `4 GB RAM / 2 CPU` prerequisite is only suitable for lightweight testing. Rancher’s published management-plane sizing guidance for production environments is substantially higher.
