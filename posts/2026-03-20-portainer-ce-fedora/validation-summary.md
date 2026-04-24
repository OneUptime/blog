# Validation Summary: How to Install Portainer CE on Fedora with Docker

## Status
validated

## Post Type
Installation guide / Tutorial

## Technologies Covered
- Fedora Linux
- Docker Engine / Docker CE
- Portainer Community Edition
- SELinux
- Podman / `podman-docker`
- firewalld
- cgroups v2

## Sources Consulted
- Docker Docs, Install Docker Engine on Fedora: https://docs.docker.com/engine/install/fedora/
- Docker Docs, Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs, Bind mounts (`:z` / `:Z` SELinux labels): https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs, Runtime metrics / cgroup v2 notes: https://docs.docker.com/engine/containers/runmetrics/
- Portainer Docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs, My host is using SELinux. Can I use Portainer?: https://docs.portainer.io/sts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Portainer Docs, Lifecycle policy: https://docs.portainer.io/sts/start/lifecycle
- Podman Docs, `podman-system-service`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Fedora Packages, `podman-docker`: https://packages.fedoraproject.org/pkgs/podman/podman-docker/
- firewalld Docs, Open a Port or Service: https://firewalld.org/documentation/howto/open-a-port-or-service

## Issues Found
1. **Outdated Fedora version support.** The post claimed the guide covered Fedora 38, 39, and 40. Docker’s current Fedora install documentation lists Fedora 42, 43, and 44 as the maintained supported versions. Updated the Overview and Prerequisites accordingly.
2. **Outdated Docker repository command.** The post used `sudo dnf config-manager --add-repo ...`, while Docker’s current Fedora documentation uses `sudo dnf config-manager addrepo --from-repofile ...`. Updated the repository setup command to match the current official syntax.
3. **Incorrect Podman conflict explanation.** The original post implied Fedora’s default Podman installation conflicts with Docker’s socket and suggested removing `podman` itself. The actual conflict relevant here is typically `podman-docker`, which provides a `docker` CLI wrapper. Updated Step 2 and the troubleshooting section to target `podman-docker` specifically and removed the incorrect socket-path explanation.
4. **Incorrect SELinux guidance for Portainer on Docker.** The post instructed readers to use a `:z` SELinux volume label on `/var/run/docker.sock`. Portainer’s official SELinux guidance for managing a local Docker environment instead requires running the container with `--privileged`. Updated the SELinux section and the `docker run` example to use `--privileged` and removed the incorrect `:z` socket mount label.
5. **Overstated conclusion about Podman itself.** The conclusion said Fedora’s default Podman installation requires extra steps. Adjusted this to the narrower and more accurate statement that extra steps are mainly needed when `podman-docker` is installed.

## Review Notes
- The Docker package list (`docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, `docker-compose-plugin`), `systemctl enable --now docker`, and Docker post-install group commands are accurate against current Docker documentation.
- The Portainer deployment command still uses `portainer/portainer-ce:latest`, which is valid, but Portainer now documents STS and LTS release streams explicitly and recommends LTS for production workloads.
- Port 9443 is the default Portainer HTTPS UI port. Port 8000 is used for the Edge tunnel and is optional depending on deployment needs, but exposing it is still consistent with Portainer’s official Docker install example.
- The cgroups v2 note remains broadly correct: Fedora uses cgroups v2 by default and Docker supports cgroups v2 on modern releases.
