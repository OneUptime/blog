# Validation Summary: How to Troubleshoot OpenShift-Specific Issues with Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- OpenShift Container Platform (OCP 4.x)
- Kubernetes (NetworkPolicy, ConfigMap, ServiceMonitor)
- OpenShift Security Context Constraints (SCCs)
- Ceph CSI drivers (RBD, CephFS)
- Prometheus / OpenShift Cluster Monitoring

## Sources Consulted
- Rook official OpenShift documentation: https://rook.io/docs/rook/latest/Getting-Started/ceph-openshift/
- Rook operator-openshift.yaml on GitHub: https://github.com/rook/rook/blob/master/deploy/examples/operator-openshift.yaml
- Rook Ceph CSI drivers documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Prometheus monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook CephCluster network providers: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- OpenShift SCC documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.11/html/authentication_and_authorization/managing-pod-security-policies
- Kubernetes Security Context docs: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Ceph documentation - Mount CephFS using kernel driver: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/

## Issues Found

### 1. Incorrect service account name `rook-ceph-default` (Issues 1 and 2)
- **What was wrong:** The blog used `rook-ceph-default` as the service account name when granting privileged and hostaccess SCCs. This is not a standard Rook service account. The official Rook `operator-openshift.yaml` uses `rook-ceph-system` and `default` (the namespace default SA).
- **What was changed:** Replaced `rook-ceph-default` with `rook-ceph-system` in the `oc adm policy` commands in Issues 1 and 2.
- **Why:** Using the wrong service account name means the SCC grant would have no effect on the actual Rook pods, leaving the original problem unsolved.

### 2. Incorrect reference to `allowPrivilegedContainer: true` in operator deployment (Issue 3)
- **What was wrong:** The blog stated to "ensure the `allowPrivilegedContainer: true` in the operator's deployment." However, `allowPrivilegedContainer` is a field in OpenShift SCC definitions, not in Kubernetes Deployment or Pod specs. This guidance is incorrect and would confuse readers.
- **What was changed:** Replaced with guidance to set the `ROOK_HOSTPATH_REQUIRES_PRIVILEGED` environment variable to `"true"` in the operator deployment, which is the correct mechanism to make OSD pods run with privileged security contexts.
- **Why:** The original instruction references a non-existent deployment field. The `ROOK_HOSTPATH_REQUIRES_PRIVILEGED` env var is the documented way to achieve this in Rook.

### 3. Wrong error message for CephFS mount failures (Issue 5)
- **What was wrong:** The blog showed `mount.nfs: Connection refused` as a symptom of CephFS mount failures. This is an NFS-specific error from the `mount.nfs` helper and has nothing to do with CephFS kernel mounts.
- **What was changed:** Replaced with `mount error: ceph filesystem not supported by the system` and added `modprobe: FATAL: Module ceph not found` as a secondary error, which are actual CephFS kernel mount failure messages.
- **Why:** Showing an NFS error for a CephFS problem is misleading and would send readers down the wrong troubleshooting path.

### 4. ConfigMap does not actually enable FUSE mounts (Issue 5)
- **What was wrong:** The ConfigMap showed `CSI_CEPHFS_PLUGIN_UPDATE_STRATEGY: "RollingUpdate"` and `CSI_CEPHFS_KERNELMOUNT_OPTIONS: "ms_mode=crc"`, neither of which switches from kernel to FUSE mounts. The first controls update strategy, and the second sets kernel mount options (the opposite of what's needed).
- **What was changed:** Replaced with `CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"`, which is the correct ConfigMap key to disable the kernel CephFS client and fall back to ceph-fuse.
- **Why:** Without `CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"`, the CSI driver continues to attempt kernel mounts, and the reader's problem remains unsolved.

## Review Notes
- The ServiceMonitor in Issue 6 uses a 5-second scrape interval (`interval: 5s`), which is very aggressive. Typical production intervals are 15s-30s. While technically valid, this could generate excessive load on the Ceph MGR and Prometheus. Consider using `interval: 15s` or `interval: 30s`.
- The ServiceMonitor selector uses only `app: rook-ceph-mgr`. The official Rook documentation also includes `rook_cluster: rook-ceph` in the selector for more precise targeting. The current selector will work but is less specific.
- The NetworkPolicy in Issue 4 is very permissive (allows all ingress/egress from any namespace). While functional for troubleshooting, production deployments should use more targeted rules.
- The post correctly covers the most common OpenShift-specific issues with Rook. The SCC, host networking, and monitoring integration sections are well-structured and practical.
