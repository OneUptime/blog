# Validation Summary: How to Check Kernel Requirements for Rook-Ceph (RBD and CephFS Modules)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Linux kernel modules (rbd, ceph, libceph)
- Kubernetes (kubectl debug, CSI drivers)
- CephFS and RBD (RADOS Block Device)
- systemd module loading (`/etc/modules-load.d/`)

## Sources Consulted
- Ceph official documentation: Mount CephFS using Kernel Driver (https://docs.ceph.com/en/reef/cephfs/mount-using-kernel-driver/)
- Rook prerequisites documentation (https://rook.io/docs/rook/latest-release/Getting-Started/Prerequisites/prerequisites/)
- Linux kernel sysfs-bus-rbd ABI documentation (https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-rbd)
- Ceph CSI GitHub repository, issue #4376 (https://github.com/ceph/ceph-csi/issues/4376) — confirms module name is `ceph`, not `cephfs`
- Rook GitHub repository `deploy/examples/` directory — verified existence of `toolbox.yaml` and absence of `node-checker.yaml`
- Kubernetes pause container source code (https://github.com/kubernetes/kubernetes/blob/master/build/pause/linux/pause.c)

## Issues Found

1. **Incorrect kernel module name `cephfs`**: The post referred to a kernel module named `cephfs` in multiple places. No such kernel module exists — the CephFS filesystem module is named `ceph` (producing `ceph.ko`), with `libceph` loaded automatically as a dependency. Fixed references in the module list, the `modprobe` commands, and the summary. Removed the line `sudo modprobe cephfs` from the "Loading Modules Manually" section.

2. **`registry.k8s.io/pause:3.9` used with shell commands**: Method 3 (Automated Check Across All Nodes) used the `pause:3.9` container image with `sh -c` commands. The pause container is a minimal statically-compiled binary with no shell or utilities — `sh` does not exist in this image. Changed to `busybox` which includes a shell.

3. **Incorrect sysfs path for RBD features**: The command used `/sys/bus/platform/drivers/rbd/*/supported_features` which is wrong — RBD is not a platform driver. The correct path is `/sys/bus/rbd/supported_features` (available since kernel 4.11). Fixed the path.

4. **Non-existent `node-checker.yaml` URL**: The post referenced `https://raw.githubusercontent.com/rook/rook/master/deploy/examples/node-checker.yaml` which returns HTTP 404 — this file does not exist in the Rook repository. Replaced the entire section with the actual Rook toolbox (`toolbox.yaml`), which does exist and provides cluster diagnostics capabilities. Updated section heading from "Running Rook's Preflight Checks" to "Using the Rook Toolbox" to accurately reflect the tool's purpose (post-deployment diagnostics rather than pre-flight checks).

## Review Notes
- The kernel version recommendations (5.4+ for full feature support, 4.17+ for basic operation) are reasonable but somewhat simplified. Per Rook docs, 4.17+ is specifically needed for CephFS quota/size enforcement, while 5.4+ enables advanced RBD features like `fast-diff`, `object-map`, and `deep-flatten`. Basic RBD with `layering` only works on much older kernels.
- The `layering` feature claim of "Works on kernel 3.10+" is reasonable (RHEL 7's kernel supports it), though the exact minimum depends on the kernel build configuration.
- The `kubectl debug` commands require Kubernetes 1.18+ with ephemeral containers enabled (GA since 1.25). This prerequisite is not mentioned in the post but is unlikely to be an issue for current deployments.
- The distribution compatibility table is reasonable but high-level. Specific package names and availability may vary by minor version.
