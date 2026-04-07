# Validation Summary: How to Test Failover in Rook Stretch Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (stretch cluster / multi-site configuration)
- Kubernetes (PVCs, pods, node cordoning)
- fio (Flexible I/O Tester)

## Sources Consulted
- Rook Stretch Cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Ceph Stretch Cluster documentation: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Kubernetes PersistentVolumeClaim API: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- fio documentation: https://fio.readthedocs.io/en/latest/

## Issues Found
- **fio test pod did not mount the PVC**: The original post created a PVC (`stretch-test-pvc`) but then used `kubectl run` to launch the fio pod, which does not support volume mounts. This meant fio was writing to ephemeral container storage rather than the Ceph stretch cluster volume, defeating the purpose of the failover test. Fixed by replacing the `kubectl run` command with a full Pod manifest that mounts the PVC at `/data`, ensuring fio writes to Ceph-backed storage during the test.

## Review Notes
- The `storageClassName: rook-ceph-stretch-block` is an example name; users will need to match it to their actual stretch cluster StorageClass.
- The section heading for Step 2 says "Cordon and drain" but the commands only cordon nodes (no `kubectl drain`). This is intentional since stopping kubelet achieves full isolation, but users should be aware that cordoning alone does not evict existing pods — the kubelet stop handles that by making the node unreachable.
- The `nixery.dev/shell/fio` image is a valid Nixery-based image but may not be available in air-gapped environments. Users in restricted environments should substitute an appropriate fio image from their internal registry.
