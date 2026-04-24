# Validation Summary: How to Run Privileged Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Linux capabilities
- AppArmor
- SELinux
- seccomp
- Linux user namespaces

## Sources Consulted
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker CLI reference: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run
- Docker Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Isolate containers with a user namespace - https://docs.docker.com/engine/security/userns-remap/
- Docker Official Image `docker` - https://hub.docker.com/_/docker
- Portainer Docs: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs: Host setup / Docker security settings - https://docs.portainer.io/2.33-lts/user/docker/host/setup
- Kubernetes Docs: Installing kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/

## Issues Found
- The post described `--privileged` too absolutely. I updated it to match Docker's documented behavior: privileged mode grants all capabilities, enables all devices, disables the default seccomp profile, and relaxes AppArmor or SELinux confinement rather than simply "turning isolation off."
- The prerequisites said Portainer admin access was required. Portainer documents privileged mode as something administrators can hide from non-admin users, so I changed this to permission-based wording instead of making admin access a universal requirement.
- The Docker socket section framed `/var/run/docker.sock` as a generally safer DinD alternative. Docker documents that bind-mounting the Docker socket gives the container broad control over the host Docker daemon, so I rewrote that note to reflect the actual risk.
- The user namespace remapping section presented `userns-remap` as an alternative to privileged mode. I clarified that it is additional hardening, not a replacement for targeted capabilities or device mappings.
- The `kubeadm` example implied a privileged containerized `kubeadm` workflow that is not how Kubernetes officially documents `kubeadm` setup. I replaced that subsection with a verified Docker-in-Docker example based on the official `docker:dind` image guidance.
- The `/etc/docker/daemon.json` example was labeled as JSON but included a comment line, which made the snippet invalid JSON. I moved the file path into the prose and kept the code block valid JSON.
- The audit command could run `docker inspect` with no arguments on Linux when no containers were running. I added `xargs -r` so the command behaves correctly in that case.

## Review Notes
- The Compose snippets use current Docker Compose service keys such as `privileged`, `cap_add`, `cap_drop`, `devices`, `security_opt`, and `tmpfs`.
- The FUSE example is technically sound as a targeted alternative to full privileged mode. On SELinux-based hosts, equivalent confinement changes may differ from the AppArmor example shown.
- I could not run Docker commands locally in this workspace because the `docker` CLI is not installed, so command verification was done against official documentation rather than live execution.
