# Validation Summary: How to Install Portainer CE on CentOS with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- CentOS Stream 9
- SELinux
- firewalld

## Sources Consulted
- Portainer: Install Portainer CE with Docker on Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer: Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer: Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Docker Docs: Install Docker Engine on CentOS: https://docs.docker.com/engine/install/centos/
- Docker Docs: Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall
- Docker Docs: Bind mounts and SELinux labels: https://docs.docker.com/engine/storage/bind-mounts/
- firewalld: `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- CentOS Project: Comparing CentOS Stream and CentOS Linux: https://www.centos.org/cl-vs-cs/
- CentOS Blog: End dates are coming for CentOS Stream 8 and CentOS Linux 7: https://blog.centos.org/2023/04/end-dates-are-coming-for-centos-stream-8-and-centos-linux-7/

## Issues Found
- The post claimed current coverage for CentOS 7 and CentOS Stream 8. Docker's current CentOS installation docs support maintained CentOS Stream releases, and the CentOS Project lists CentOS Stream 8 EOL as May 31, 2024 and CentOS Linux 7 EOL as June 30, 2024. I updated the article to cover CentOS Stream 9 only.
- The Docker removal/install section used an outdated conflicting-package removal list and mixed old CentOS 7-specific guidance with current Stream guidance. I replaced it with Docker's current documented `dnf`-based CentOS flow and current conflicting-package list.
- The Portainer deployment and update commands used `portainer/portainer-ce:latest`. Portainer's current install and upgrade docs use documented release-stream tags such as `:lts` and `:sts`. I updated the article to use `portainer/portainer-ce:lts`.
- The SELinux guidance said the `:z` bind-mount label was the right approach for Portainer on CentOS. Portainer's official Docker-on-Linux install docs instead state that SELinux is assumed disabled, and that if SELinux must remain enabled, Portainer should be deployed with `--privileged`. I corrected the SELinux, deployment, troubleshooting, and update sections to match Portainer's documentation.
- The firewall section treated port `8000` like a standard required port. Portainer's requirements docs state that `8000` is optional and only needed for Edge Agents. I clarified that in the firewall and deployment notes.
- The conclusion repeated the incorrect `:z` guidance and made a broader cross-distribution claim than the documentation supports. I rewrote it to match the documented HTTPS access and SELinux behavior.

## Review Notes
- Portainer's requirements page currently lists recent CE LTS releases as validated with Docker 28.x and 29.x; the post does not pin a Docker version, so the current repository-based install approach remains appropriate.
- Docker's CentOS install page also documents CentOS Stream 10, but I did not expand the post beyond Stream 9 because the task was to correct errors with minimal scope change.
