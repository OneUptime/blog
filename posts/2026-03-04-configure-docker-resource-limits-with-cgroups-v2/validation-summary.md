# Validation Summary: How to Configure Docker Resource Limits with cgroups v2 on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Docker Engine
- Linux cgroups v2
- systemd
- firewalld

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Runtime metrics and cgroups - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Red Hat Documentation: Understanding control groups in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- Red Hat Customer Portal: Migrating from cgroups v1 to cgroups v2 in RHEL - https://access.redhat.com/articles/3735611

## Issues Found
- The original post used placeholder commands such as `dnf install <package-name>`, `/etc/<service>/config.conf`, `systemctl enable --now <service>`, and `<service> --test`. Replaced them with Docker Engine repository setup, package installation, service management, and verification commands from Docker's RHEL installation documentation.
- The original post installed unrelated packages such as `epel-release` and `"Development Tools"` without explaining why they were required. Replaced them with `dnf-plugins-core`, which Docker documents as required for repository setup.
- The original post did not verify cgroups v2. Added the documented `/sys/fs/cgroup/cgroup.controllers` check and noted that RHEL 9 uses cgroups v2 by default.
- The original post did not explain Docker's cgroups v2 version requirements. Added Docker's documented requirements for Docker Engine, containerd, runc, and kernel support.
- The original post did not configure Docker's cgroup driver. Added a valid `/etc/docker/daemon.json` example using `native.cgroupdriver=systemd`, which is appropriate for systemd-based cgroups v2 hosts.
- The original post did not show any Docker resource limits. Added a `docker run` example using `--memory`, `--memory-swap`, and `--cpus`, then added verification with `docker info`, `docker stats`, `docker inspect`, and the cgroups v2 `memory.max` file.
- The original firewall example used `--add-service=<service>`, which is not meaningful for Docker resource limits. Replaced it with a note that resource limits do not require firewall changes and provided a concrete published-port example.

## Review Notes
The revised post is technically accurate for maintained RHEL releases supported by Docker Engine. Docker uses the `systemd` cgroup driver by default on cgroups v2 hosts when systemd is available, but the explicit daemon setting is still valid and makes the expected behavior clear.
