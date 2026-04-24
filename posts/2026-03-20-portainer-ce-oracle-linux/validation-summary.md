# Validation Summary: How to Install Portainer CE on Oracle Linux with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Oracle Linux 8
- Oracle Linux 9
- Docker Engine / Docker CE
- Portainer CE
- SELinux
- firewalld
- Oracle Cloud Infrastructure (OCI) instance metadata service
- Linux cgroups

## Sources Consulted
- Docker Docs, Install Docker Engine on RHEL: https://docs.docker.com/engine/install/rhel/
- Docker Docs, Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs, Bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Portainer Documentation, Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Documentation, Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Documentation, Lifecycle policy: https://docs.portainer.io/start/lifecycle
- Oracle Cloud Infrastructure Documentation, Getting Instance Metadata: https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/gettingmetadata.htm
- Oracle Linux Documentation, About Podman and Related Utilities: https://docs.oracle.com/en/operating-systems/oracle-linux/podman/about-podman.html
- Oracle Linux Documentation, Install Podman and Related Utilities: https://docs.oracle.com/en/operating-systems/oracle-linux/podman/install.html
- Oracle Linux 8 Documentation, Managing Resources Using Control Groups: https://docs.oracle.com/en/operating-systems/oracle-linux/8/boot/boot-Managing_Resources_Cgroups.html
- Oracle Learn, Run Control Group Version 2 on Oracle Linux: https://docs.oracle.com/en/learn/ol-cgroup-v2/index.html

## Issues Found
- The original Docker repository example used Docker's CentOS repo. I updated it to Docker's RHEL repo because Docker's current official RPM install guidance is published for RHEL 8 and 9. This is an inference based on Oracle Linux being RHEL-compatible, not an Oracle Linux-specific Docker document.
- The conflicting-package removal step was incomplete and partly inaccurate. I updated it to match Docker's current RHEL guidance for old Docker packages plus `podman` and `runc`, and kept `podman-docker` because Oracle documents that it aliases the `docker` command.
- The post used `jq` in OCI examples without installing it first. I added `jq` to the prerequisite package install command.
- The SELinux section referred to `docker-selinux`, which is not the current EL package to verify. I corrected this to `container-selinux`.
- The Portainer deployment command used `:latest` and a socket mount with `:z`. I updated it to use the current Portainer Docker install pattern more closely by switching to `portainer/portainer-ce:sts`, removing the socket relabel suffix, and adding `--privileged`, which Portainer documents as necessary when SELinux is enabled.
- The OCI metadata commands used IMDSv1 endpoints and omitted the `Authorization: Bearer Oracle` header required for IMDSv2 requests. One command also queried the instance metadata object instead of the VNIC public IP. I updated both commands to use the IMDSv2 VNIC endpoint and extract `.[0].publicIp`.
- The cgroup verification command assumed cgroup v2 and could fail on Oracle Linux 8, which defaults to cgroup v1. I changed it to `stat -fc %T /sys/fs/cgroup`, which works across both Oracle Linux 8 and 9.

## Review Notes
- Portainer's current Docker install page uses the moving `sts` tag, while Portainer's lifecycle documentation recommends LTS releases for production workloads. The post now matches the current install documentation, but a future production-focused revision could pin a maintained LTS release explicitly.
- Docker does not publish an Oracle Linux-specific Docker Engine install page. The repository guidance in the post was aligned to Docker's official RHEL instructions because Oracle Linux is RHEL-compatible.
