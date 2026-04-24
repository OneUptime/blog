# Validation Summary: Installing Portainer CE on Fedora with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fedora
- Docker Engine
- Portainer CE
- SELinux
- firewalld

## Sources Consulted
- Docker Engine on Fedora - https://docs.docker.com/engine/install/fedora/
- Docker Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- Portainer CE install with Docker on Linux (2.33 LTS) - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer SELinux FAQ (2.33 LTS) - https://docs.portainer.io/2.33-lts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Portainer update on Docker Standalone (2.33 LTS) - https://docs.portainer.io/2.33-lts/start/upgrade/docker
- firewalld `firewall-cmd` manual - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The prerequisite `Fedora 38 or later` was outdated. Docker's current Fedora install documentation supports maintained Fedora releases 42, 43, and 44, so I updated the prerequisite accordingly.
- The Docker installation step used Docker's convenience script as the main install flow. Docker's Fedora documentation recommends installing from Docker's RPM repository, so I replaced the commands with the current repository-based install commands.
- The note suggesting Podman may need to be removed first was not supported by the official Docker installation guidance I checked, so I removed it.
- The Portainer deployment command used `portainer/portainer-ce:latest`. Portainer's current LTS installation and upgrade documentation uses `portainer/portainer-ce:lts`, so I updated both the install and update commands.
- The original Fedora guide omitted the SELinux requirement that Portainer documents for local Docker environments. Because Fedora enables SELinux by default, I added `--privileged` to the Portainer container run command and replaced the incorrect SELinux troubleshooting commands with the documented redeploy approach.
- The troubleshooting section recommended `chmod 666 /var/run/docker.sock`, which is not Docker's documented post-install method for non-root access and weakens socket security. I replaced it with Docker's documented `docker` group membership commands.

## Review Notes
- Portainer's Docker install documentation notes that port `8000` is optional and is only required for Edge Agent communication. The post still opens `8000` because the deployment command publishes it.
- Docker's post-installation documentation warns that membership in the `docker` group grants root-level privileges.
- The commands were validated against current official documentation, but they were not executed in this workspace because it is not a Fedora host with Docker and Portainer installed.
