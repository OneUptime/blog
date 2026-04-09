# Validation Summary: How to Deploy Rook-Ceph on CentOS Kubernetes Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook v1.15.0 (Kubernetes storage orchestrator)
- Ceph Squid v19.2.0 (distributed storage)
- Kubernetes (container orchestration)
- CentOS 8/9 and RHEL 8/9 (operating system)
- SELinux (mandatory access control)
- firewalld (firewall management)
- LVM2 (logical volume management)

## Sources Consulted
- Rook official documentation: Prerequisites page (https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/)
- Rook GitHub releases: v1.15.0 confirmed at https://github.com/rook/rook/releases/tag/v1.15.0
- Ceph documentation: Network configuration reference (https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/)
- Ceph Squid (v19.2.0) release confirmed in ceph/ceph repository
- RHEL/CentOS container-selinux documentation for SELinux context types

## Issues Found
1. **SELinux context type was outdated.** The post used `svirt_sandbox_file_t` in the `chcon` and `semanage` commands (Step 3). This is the legacy Docker-era SELinux type from RHEL/CentOS 7. Since the post explicitly targets CentOS 8/9 and RHEL 8/9, the correct type is `container_file_t` (provided by the `container-selinux` package). Changed all occurrences of `svirt_sandbox_file_t` to `container_file_t`.

## Review Notes
- The Rook toolbox pod (`toolbox.yaml`) must be deployed before the Step 8 verification commands will work. The post omits this step, though the focus is on CentOS-specific preparation rather than a complete deployment guide.
- `mgr.count: 1` is valid but production deployments typically use `count: 2` for high availability of the Ceph manager daemon.
- The OSD port range 6800-7300 is a commonly used practical subset. The full upstream Ceph daemon port range is 6800-7568 per official docs. The range used in the post matches what Rook documentation typically recommends.
- CentOS 8 reached EOL in December 2021 and CentOS Stream 8 reached EOL in May 2024. Users targeting CentOS should use CentOS Stream 9 or RHEL 9.
