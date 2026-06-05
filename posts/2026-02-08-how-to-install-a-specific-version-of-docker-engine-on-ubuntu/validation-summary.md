# Validation Summary: How to Install a Specific Version of Docker Engine on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose plugin
- containerd
- Ubuntu apt repositories
- apt package holds and preferences
- unattended-upgrades
- Kubernetes container runtimes
- Ansible apt and dpkg_selections modules

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu, https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Install the Docker Compose plugin, https://docs.docker.com/compose/install/linux/
- Docker Ubuntu package repository metadata for noble amd64, https://download.docker.com/linux/ubuntu/dists/noble/stable/binary-amd64/Packages
- Kubernetes Docs: Container Runtimes, https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes Docs: kubectl version, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Debian manpages: apt_preferences(5), https://manpages.debian.org/buster/apt/apt_preferences.5.en.html
- Ubuntu Server Docs: Automatic updates, https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- Ansible Docs: ansible.builtin.apt module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Local apt command help for apt-mark and apt-cache.

## Issues Found
- The post said Kubernetes clusters mandate compatible Docker versions and that each Kubernetes release supports specific Docker versions. Modern Kubernetes requires CRI-compatible runtimes and removed built-in dockershim support in v1.24. Updated the wording to specify Docker Engine through cri-dockerd and to point readers at Kubernetes and cri-dockerd compatibility.
- The prerequisites said "Ubuntu 22.04, 24.04, or later." Docker's current official Ubuntu support is for specific releases, not every later release. Updated the list to Ubuntu 22.04, 24.04, 25.10, and 26.04.
- One install comment said Docker CE, CLI, and containerd were all installed at the specific version, but the command only pins docker-ce and docker-ce-cli. Updated the comment to say Docker CE and CLI are pinned while containerd and plugins are installed as compatible packages.
- The Kubernetes version check used `kubectl version --short`, which is not present in the current generated kubectl version reference. Updated it to `kubectl version`.

## Review Notes
- The pinned example version `5:27.3.1-1~ubuntu.24.04~noble` still exists in Docker's Ubuntu noble repository for docker-ce and docker-ce-cli as of this review.
- The example `containerd.io=1.7.22-1` version also exists in the Docker Ubuntu noble repository and satisfies Docker CE 27.3.1's `containerd.io (>= 1.6.24)` dependency.
- Docker's current Ubuntu installation docs use `apt list --all-versions docker-ce` and a deb822 `docker.sources` file. The post's `apt-cache madison` and one-line apt source examples remain technically valid, but future updates could align them with Docker's current presentation.
