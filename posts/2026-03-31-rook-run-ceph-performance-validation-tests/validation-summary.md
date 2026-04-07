# Validation Summary: How to Run Ceph Performance Validation Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS, RBD)
- Rook (Ceph operator for Kubernetes)
- rados bench (object storage benchmarking)
- rbd bench (block device benchmarking)
- fio (flexible I/O tester)
- Kubernetes (Pods, PVCs, kubectl exec)

## Sources Consulted
- Ceph official documentation for `rados bench`: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph official documentation for `rbd bench`: https://docs.ceph.com/en/latest/man/8/rbd/
- fio official documentation: https://fio.readthedocs.io/en/latest/fio_doc.html
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes Pod spec reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/

## Issues Found
1. **Missing `--size` parameter in fio configuration**: The fio Pod spec did not include a `--size` argument. When fio targets a file that does not yet exist (as is the case on a freshly provisioned PVC), it requires `--size` to know how large a test file to create. Without it, fio exits with an error. Added `--size=1G` to the fio command arguments.

## Review Notes
- The `rados bench -b 4096` flag uses a 4KB block size, which is appropriate for IOPS testing but differs from the default 4MB used for throughput benchmarking. This is consistent with the post's performance table showing 4K IOPS figures.
- The `ljishen/fio` Docker image is a community image. Users in production environments may prefer building their own fio image or using an alternative maintained image.
- The performance ranges table provides aggregate cluster numbers (not per-OSD), which is reasonable but could vary significantly depending on replication factor, number of OSDs, and network configuration. The ranges given are broadly reasonable.
- The `rbd bench` comment `# 1 GB` inline with `--io-total 1073741824` is valid bash (treated as a comment) and the math is correct (1073741824 = 1 GiB).
