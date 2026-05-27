# Validation Summary: How to Use Ansible to Install Docker CE Packages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Docker Engine / Docker CE
- Ubuntu APT repositories
- RHEL and CentOS DNF/YUM repositories
- systemd
- Docker daemon configuration
- Docker TLS configuration

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Install Docker Engine on CentOS - https://docs.docker.com/engine/install/centos/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Configure remote access for Docker daemon - https://docs.docker.com/engine/daemon/remote-access/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Ansible Documentation: ansible.builtin.apt_repository - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/apt_repository_module.html
- Ansible Documentation: ansible.builtin.dnf - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible Documentation: ansible.builtin.yum_repository - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html

## Issues Found
- The Ubuntu cleanup task used an older conflicting-package list. Updated it to match Docker's current Ubuntu guidance by removing packages such as `docker-compose`, `docker-compose-v2`, `docker-doc`, and `podman-docker`.
- The Ubuntu repository example derived APT architecture from `ansible_architecture` with only an `x86_64` mapping. Replaced it with `dpkg --print-architecture`, which matches Docker's current APT repository instructions across supported Ubuntu architectures.
- The RHEL/CentOS repository example always used the CentOS Docker repository path. Updated it to select `rhel` for Red Hat Enterprise Linux and `centos` otherwise.
- The RHEL required package list included older storage-related prerequisites. Updated it to use `dnf-plugins-core`, matching Docker's current repository setup guidance.
- The specific-version Ubuntu example used an invalid Docker package version format and omitted the plugin packages from the pinned install. Replaced it with a `docker_version_string` value in Docker's documented format and included the Buildx and Compose plugin packages.
- The daemon metrics example set `metrics-addr` while keeping `experimental` disabled. Docker documents daemon metrics as experimental, so the example now enables `experimental` and binds metrics to localhost.
- The TLS remote-access example set `hosts` in `daemon.json`, which conflicts with Docker's systemd `-H` startup option. Moved the host listener configuration into a systemd drop-in override and left TLS settings in `daemon.json`.

## Review Notes
The examples were reviewed for documentation-level correctness, but they were not executed against live Ubuntu, RHEL, or CentOS hosts because doing so would require target machines with package-manager access and Docker repository availability.
