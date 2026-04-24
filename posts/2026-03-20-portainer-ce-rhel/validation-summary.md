# Validation Summary: How to Install Portainer CE on RHEL with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL) 8 and 9
- Docker Engine / Docker CE
- Portainer Community Edition
- SELinux
- firewalld
- Podman

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs: Install Portainer CE with Podman on Linux - https://docs.portainer.io/start/install-ce/server/podman/linux
- Red Hat Docs: Building, running, and managing containers on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/creating-a-quadlet-application-with-secrets_managing-containers-using-the-ansible-playbook
- Red Hat Docs: Containers considerations in adopting RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_containers_considerations-in-adopting-rhel-9
- firewalld manual page: firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post said Docker on RHEL should use the CentOS repository. I changed the repository URL to Docker's official RHEL repository because Docker now publishes a dedicated RHEL install path.
- The overview said Docker CE can be installed alongside Podman. I corrected this to reflect Docker's official RHEL instructions, which explicitly require removing conflicting packages such as `podman` and `runc` first.
- The conflicting-package removal example was incomplete and removed unrelated tools while missing Docker's official package list. I replaced it with Docker's documented RHEL uninstall command set.
- The SELinux guidance was incorrect. The post claimed the `:z` socket label was the critical requirement, but Portainer's official Docker install documentation says SELinux is assumed disabled and requires `--privileged` when deploying on SELinux-enabled hosts. I updated both the SELinux explanation and the `docker run` command accordingly.
- The Portainer deployment command used `portainer/portainer-ce:latest`, which does not match Portainer's current official Docker installation guidance. I changed it to `portainer/portainer-ce:sts`.
- The firewalld step treated port `8000` as universally required. I clarified that `8000/tcp` is optional and only needed for Edge agents, matching Portainer's documentation.
- The support/subscription section was misleading and included an inaccurate "RHEL with Docker BE" option. I rewrote this section to distinguish Docker's upstream RHEL packages from Red Hat's supported Podman-based stack and removed the incorrect product reference.
- The verification step used `curl` against `/api/status`, which is not part of the public installation guidance. I changed it to `curl -k https://localhost:9443`, which directly verifies the documented Portainer HTTPS endpoint.

## Review Notes
- Portainer's current Docker-on-Linux documentation uses the `:sts` image tag. Readers who need a slower Portainer release cadence should review Portainer's LTS documentation before production rollout.
- Portainer's Docker install guidance also assumes Docker is running as root; rootless Docker requires extra configuration and is outside the scope of this post.
