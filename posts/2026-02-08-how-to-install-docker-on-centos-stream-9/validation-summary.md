# Validation Summary: How to Install Docker on CentOS Stream 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Docker Buildx
- containerd
- CentOS Stream 9
- DNF
- systemd
- SELinux
- firewalld

## Sources Consulted
- Docker Docs: Install Docker Engine on CentOS, https://docs.docker.com/engine/install/centos/
- Docker Docs: Linux post-installation steps for Docker Engine, https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Docker daemon configuration overview, https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd reference, https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Configure logging drivers, https://docs.docker.com/engine/logging/configure/
- Docker Docs: Bind mounts, including SELinux `:z` and `:Z` labels, https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Packet filtering and firewalls, https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Install the Docker Compose plugin, https://docs.docker.com/compose/install/linux/
- Docker Docs: Install Docker Compose standalone (Legacy), https://docs.docker.com/compose/install/standalone/
- Kubernetes Docs: Container runtimes and cgroup drivers, https://kubernetes.io/docs/setup/production-environment/container-runtimes/

## Issues Found
- The repository setup step used `yum-utils` and `yum-config-manager`, while Docker's current CentOS installation docs use `dnf-plugins-core` and `dnf config-manager`. Updated the dependency package, command, and explanatory text.
- The removal step described Podman and Buildah as packages that should be removed first on CentOS Stream 9. Docker's current CentOS instructions focus on removing old or conflicting Docker packages, so the command and explanation were narrowed to those packages.
- The Docker GPG key prompt did not include the official fingerprint. Added Docker's documented fingerprint so readers can verify the key before accepting it.
- `sudo groupadd docker` can fail if the Docker package already created the group. Changed it to `sudo groupadd -f docker` to match the note that the group may already exist.
- The firewalld section recommended adding `docker0` to the `trusted` zone. Docker's current documentation says Docker creates a `docker` firewalld zone for bridge interfaces when firewalld is enabled, so the section was corrected to describe that behavior and keep only the host port-opening example.
- The standalone Docker Compose download command used `$(uname -s)`, which produces `Linux` on CentOS while current Compose release asset names use lowercase `linux`. Updated the command to lowercase the OS segment.
- The conflict troubleshooting install command and the Docker-only update command omitted the Buildx and Compose plugin packages installed earlier. Updated both commands to include those Docker-related packages.

## Review Notes
The systemd cgroup driver configuration is technically valid, but Docker now uses `systemd` by default on cgroup v2 hosts with systemd available. Keeping the explicit setting is still reasonable for Kubernetes-oriented setups, but it may be redundant on a typical CentOS Stream 9 host.
