# Validation Summary: How to Install Ceph on AlmaLinux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Squid release) — distributed storage system
- AlmaLinux 9 — RHEL-compatible Linux distribution
- cephadm — Ceph deployment and management tool
- Podman — container runtime used by cephadm
- firewalld — Linux firewall management
- SELinux — mandatory access control system
- RBD (RADOS Block Device) — Ceph block storage
- chrony — NTP time synchronization

## Sources Consulted
- Ceph documentation for cephadm installation: https://docs.ceph.com/en/latest/cephadm/install/
- Ceph documentation for cephadm bootstrap: https://docs.ceph.com/en/latest/cephadm/host-management/
- Ceph orchestrator CLI reference: https://docs.ceph.com/en/latest/cephadm/services/osd/
- AlmaLinux 9 / RHEL 9 SELinux documentation for policycoreutils-python-utils package
- firewalld predefined service list for RHEL 9 (ceph, ceph-mon services)
- Sibling blog post for Rocky Linux (`posts/2026-03-31-rook-install-ceph-rocky-linux/README.md`) for cross-reference

## Issues Found
1. **Missing `policycoreutils-python-utils` package in Step 1**: The `semanage` command used in Step 3 (Configure SELinux) requires the `policycoreutils-python-utils` package, which is not installed by default on AlmaLinux 9. Without it, `semanage fcontext` fails with "command not found." Added this package to the `dnf install` line in Step 1. The sibling Rocky Linux post correctly includes this package; the AlmaLinux post was missing it.

## Review Notes
- The RGW firewall port (7480/tcp) in Step 2 is not the default for cephadm-deployed RGW, which defaults to port 80. However, 7480 is a valid and commonly used alternative port, so this is not incorrect — just worth noting for readers who use the default cephadm RGW configuration.
- The `ceph osd pool create mypool 32` command in Step 7 manually specifies 32 PGs. Since Ceph Nautilus+, the pg_autoscaler module is enabled by default and can manage PG counts automatically. Manual PG specification still works but readers should be aware of the autoscaler.
- All cephadm commands, bootstrap flags, orchestrator commands, and RBD operations are correct and current for Ceph Squid on EL9.
