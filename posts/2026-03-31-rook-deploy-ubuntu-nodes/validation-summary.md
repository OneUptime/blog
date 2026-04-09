# Validation Summary: How to Deploy Rook-Ceph on Ubuntu Kubernetes Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.15.0)
- Ceph Squid (v19.2.0)
- Kubernetes
- Ubuntu (20.04, 22.04+)
- UFW firewall
- AppArmor
- LVM2, wipefs, modprobe

## Sources Consulted
- Rook v1.15 official documentation — https://rook.io/docs/rook/v1.15/
- Rook GitHub repository deploy/examples path — https://github.com/rook/rook/tree/release-1.15/deploy/examples
- Ceph Squid v19.2.0 release announcement — https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/
- Quay.io Ceph container images — https://quay.io/repository/ceph/ceph
- Kubernetes AppArmor documentation — https://kubernetes.io/docs/tutorials/security/apparmor/
- Ubuntu linux-modules-extra package naming conventions (Ubuntu package repositories)
- Ceph network port requirements — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/

## Issues Found

### 1. Incorrect HWE kernel package name (Line 41)
- **What was wrong:** The command `apt-get install -y linux-modules-extra-$(uname -r)-generic` appends `-generic` to the package name, but `uname -r` on Ubuntu already returns a string ending in `-generic` (e.g., `6.5.0-44-generic`). This produces an invalid double-suffix package name like `linux-modules-extra-6.5.0-44-generic-generic`, which would cause apt-get to fail.
- **What was changed:** Removed the extra `-generic` suffix and added a note explaining that `uname -r` already includes the suffix, so the same command works for both standard and HWE kernels.
- **Why:** The correct package name is `linux-modules-extra-$(uname -r)` for all Ubuntu kernel variants.

### 2. Incorrect AppArmor annotation key format (Line 195)
- **What was wrong:** The annotation was written as `apparmor.security.beta.kubernetes.io/pod: runtime/default`. This is not a valid Kubernetes AppArmor annotation key.
- **What was changed:** Fixed to `container.apparmor.security.beta.kubernetes.io/<container_name>: runtime/default`, which is the correct per-container annotation format per Kubernetes documentation.
- **Why:** Kubernetes AppArmor annotations are per-container and must use the `container.apparmor.security.beta.kubernetes.io/<container_name>` key format.

## Review Notes
- Rook v1.15.0 and Ceph Squid v19.2.0 are confirmed as valid, released versions. Rook v1.15 supports Ceph Quincy (v17), Reef (v18), and Squid (v19).
- As of Kubernetes v1.30+, AppArmor can also be configured via the `securityContext.appArmorProfile` field, making the annotation approach legacy. The post targets Ubuntu 20.04 troubleshooting where older Kubernetes versions are likely, so the annotation approach remains appropriate.
- The UFW port ranges (6789, 3300, 6800-7300, 8443, 9283) are all correct for Ceph Mon, Msgr2, OSD, Dashboard, and Metrics respectively.
- The CephCluster CRD manifest is well-structured with explicit node/device lists, which is the recommended approach to avoid accidental OS disk consumption.
