# Validation Summary: How to Set Up cgroups v2 for Resource Control on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Linux cgroups v2
- Ubuntu
- GRUB kernel command line configuration
- systemd slices, services, scopes, and resource control
- Docker, Docker Compose, Podman, and Kubernetes resource limits
- Bash monitoring and setup scripts

## Sources Consulted
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux man-pages cgroups(7): https://man7.org/linux/man-pages/man7/cgroups.7.html
- systemd.resource-control(5): https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html
- systemd-run(1) local man page
- Docker CLI help for `docker run`, `docker info`, and `docker inspect`
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Kubernetes cgroup v2 documentation: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Ubuntu security documentation for cgroups: https://documentation.ubuntu.com/security/security-features/privilege-restriction/cgroups/
- Ubuntu release notes and real-time cpuset documentation: https://documentation.ubuntu.com/release-notes/22.04/ and https://documentation.ubuntu.com/real-time/latest/how-to/isolate-workload-cpusets/

## Issues Found
- The Ubuntu version statement implied all Ubuntu 20.04+ systems may need enabling in the same way. Updated it to clarify that 22.04 LTS and later generally use cgroups v2 by default, while 20.04 LTS and customized/upgraded systems may still use cgroups v1 or hybrid mode.
- The GRUB example used `GRUB_CMDLINE_LINUX_DEFAULT`; Kubernetes and Ubuntu guidance commonly place `systemd.unified_cgroup_hierarchy=1` in `GRUB_CMDLINE_LINUX`. Updated the example accordingly.
- The root cgroup section said the root cgroup contains all processes by default. Clarified that this is true at boot/initial hierarchy creation, but systemd-managed Ubuntu systems organize processes under child slices.
- The no-internal-process description was too broad. Updated it to match the cgroup v2 domain-controller rule: non-root domain cgroups cannot enable domain controllers for children while containing direct processes.
- The memory limit example suggested `512M` might be written directly to `memory.max`. Replaced that with a portable byte-value note and pointed readers to systemd properties for human-readable units.
- The sample systemd slice used a placeholder `https://example.com/docs` Documentation URL. Replaced it with the systemd resource-control manual.
- The delegation section called a `.slice` unit a user service. Corrected the wording to "user slice."

## Review Notes
The direct cgroupfs examples are technically valid, but production Ubuntu systems are usually systemd-managed, so manual writes under `/sys/fs/cgroup` should be treated as demonstrations or controlled experiments. systemd resource-control settings are the better production interface for long-running services.
