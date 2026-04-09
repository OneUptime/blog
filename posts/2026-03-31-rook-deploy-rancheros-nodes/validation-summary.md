# Validation Summary: How to Deploy Rook-Ceph on RancherOS Kubernetes Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes
- RancherOS (container-optimized Linux distribution)
- RancherOS CLI (`ros`)
- system-docker

## Sources Consulted
- RancherOS official documentation: loading kernel modules (`rancher.modules` cloud-config key) — https://rancher.com/docs/os/v1.x/en/configuration/loading-kernel-modules/
- RancherOS official documentation: switching consoles (`ros console switch` vs `ros console enable`) — https://rancher.com/docs/os/v1.x/en/configuration/switching-consoles/
- RancherOS official documentation: `ros config merge` CLI usage (requires `-i` flag or stdin, not a positional file argument) — https://rancher.com/docs/os/v1.x/en/configuration/
- Rook-Ceph documentation: prerequisites, CephCluster CRD spec, operator deployment — https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/
- Rook GitHub repository: deploy examples structure (`crds.yaml`, `common.yaml`, `operator.yaml`) — https://github.com/rook/rook/tree/master/deploy/examples
- Rook GitHub issue #6078: lvm2 availability on RancherOS — https://github.com/rook/rook/issues/6078
- Ceph documentation: kernel client requirements for RBD and CephFS

## Issues Found

### 1. `system-docker run --rm` command does not install lvm2 on the host (Step 4)
**What was wrong:** The command `sudo system-docker run --rm --privileged -v /:/host ubuntu:20.04 apt-get install -y lvm2` runs `apt-get install` inside a temporary container. The `-v /:/host` mounts the host filesystem at `/host`, but `apt-get` installs into the container's own root filesystem (`/`), not into `/host`. The `--rm` flag then deletes the container immediately, so lvm2 is never actually made available on the host.

**What was changed:** Removed the broken `system-docker run` command entirely. Replaced the section with the correct approach: using `sudo ros console enable ubuntu` to persistently switch to an Ubuntu console, then using `apt-get` to install packages.

**Why:** The original command had zero practical effect — it installed a package inside an ephemeral container that was immediately destroyed. The console switch approach is the documented and correct way to install packages on RancherOS.

### 2. `ros config merge` missing `-i` flag (Step 2)
**What was wrong:** The command `ros config merge /var/lib/rancher/conf/cloud-config.d/rook-modules.yml` passes the file path as a positional argument. The `ros config merge` command does not accept positional file path arguments — it reads from stdin by default.

**What was changed:** Updated to `sudo ros config merge -i /var/lib/rancher/conf/cloud-config.d/rook-modules.yml` using the `-i` flag for file input.

**Why:** Without the `-i` flag, the command would fail or ignore the file path argument entirely.

### 3. `ros console switch` does not persist across reboots (Step 4)
**What was wrong:** The post used `ros console switch ubuntu`, which switches the console for the current session but does not persist across reboots.

**What was changed:** Replaced with `ros console enable ubuntu`, which makes the console switch persistent across reboots, and added a note explaining this.

**Why:** For installing packages that need to remain available (like lvm2 for Rook OSD management), the console switch must persist. `ros console enable` is the correct command for this.

## Review Notes
- RancherOS has reached end-of-life, which the post correctly notes in its Migration Recommendation section. New deployments should use RKE2 on a supported OS.
- The kernel version requirements stated ("4.1+ for CephFS and 3.10+ for RBD") are approximately correct but imprecise. The Ceph project recommends kernel 4.17+ for CephFS with full feature support (including quotas). The stated 4.1+ minimum is sufficient for basic CephFS operation but may lack important bug fixes and features.
- The `rancher.modules` cloud-config key and YAML list syntax are correct per RancherOS documentation.
- Rook v1.15.0 and Ceph v19.2.0 (Squid) are plausible version combinations for a March 2026 deployment.
- The CephCluster CRD spec is correctly structured for the Rook API (`ceph.rook.io/v1`).
- The `mgr.count: 1` setting is valid but production deployments should consider `count: 2` for high availability.
- lvm2 may already be available in the default RancherOS console since v1.2.0 (at `/sbin/lvm` or `/rootfs/sbin/lvm`), which could make the console switch unnecessary in some RancherOS versions. The post's approach of explicitly installing it is a safe fallback.
