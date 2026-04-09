# Validation Summary: How to Configure dataDirHostPath in the Rook CephCluster CRD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- CephCluster CRD (`ceph.rook.io/v1`)
- Kubernetes (`kubectl debug`, hostPath volumes, PVCs)
- SELinux

## Sources Consulted
- Rook official documentation on CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephCluster examples: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Red Hat SELinux documentation for container contexts

## Issues Found

1. **"keystone" should be "keyring" (line 29):** The post listed "Monitor data and keystone files" under what gets stored in `dataDirHostPath`. "Keystone" is OpenStack's identity service and is unrelated to Ceph/Rook. The correct term is "keyring" files (e.g., `client.admin.keyring`, bootstrap keyrings). Changed to "Monitor data and keyring files".

2. **Missing `--image` flag in `kubectl debug node/` commands (lines 69-76):** The `kubectl debug node/<name>` command requires the `--image` flag to specify which container image to use for the debug pod. Without it, the command fails with an error. Added `--image=busybox` to both `kubectl debug` commands.

3. **Incorrect reference to `preparePlacement` (line 151):** The comment suggested using `preparePlacement` tolerations in the CephCluster CRD to handle SELinux contexts, but `preparePlacement` is not a valid field for this purpose in the CephCluster CRD. Replaced with a more accurate suggestion to use MachineConfig on OpenShift to apply SELinux contexts across nodes.

## Review Notes
- The SELinux context `svirt_sandbox_file_t` referenced in the `chcon` command is associated with Docker-based container runtimes. On modern Kubernetes deployments using CRI-O or containerd (especially OpenShift 4.x+), `container_file_t` is the more appropriate SELinux context. The current value will still work in many environments, but readers on modern CRI-O-based platforms may need to use `container_file_t` instead.
- The `ceph status` output example shows a slightly simplified format. Actual output format varies by Ceph version, but the concept demonstrated is accurate.
