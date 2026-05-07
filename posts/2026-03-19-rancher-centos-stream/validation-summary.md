# Validation Summary: How to Install Rancher on CentOS Stream

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Docker Engine / Docker CE
- CentOS Stream 9
- Kubernetes
- firewalld
- SELinux
- Linux kernel modules and `sysctl`

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Port Requirements - https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher: Authentication, Permissions and Global Settings - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration
- Rancher: About rancher-selinux - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-security/selinux-rpm/about-rancher-selinux
- Docker Docs: Install Docker Engine on CentOS - https://docs.docker.com/engine/install/centos/
- Kubernetes Docs: Swap memory management - https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/

## Issues Found
- The post implied that the Docker-based Rancher install was suitable as a general enterprise deployment path. I updated the description, introduction, and conclusion to reflect Rancher's official guidance that the single-node Docker install is for testing and development, not production.
- The Docker dependency step used older package guidance (`yum-utils`, `device-mapper-persistent-data`, and `lvm2`). I replaced it with `dnf-plugins-core` plus the download tools, matching Docker's current CentOS Stream 9 installation instructions.
- The firewall section incorrectly opened inbound port `6443` on the Rancher host. I removed it because Rancher's Docker install requires inbound `80` and `443` on the server, while `6443` is documented as outbound access to hosted or imported Kubernetes API servers.
- The first-login checklist included an unsupported mandatory "Accept the terms and conditions" step. I removed it so the flow matches Rancher's documented bootstrap process of resetting the admin password and setting the Rancher Server URL.

## Review Notes
- The swap-disable step remains acceptable because Kubernetes still defaults to not starting kubelet on Linux nodes with swap enabled unless swap support is explicitly configured.
- The guide still uses `rancher/rancher:latest`, which matches Rancher's official single-node Docker documentation, but it is version-sensitive and will follow the latest Rancher release over time.
