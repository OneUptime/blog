# Validation Summary: How to Test Ceph Release Candidates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (release candidate testing workflow)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl, Helm)
- Podman (container image discovery)
- RADOS bench (Ceph benchmarking tool)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph download repository structure: https://download.ceph.com/
- Rook Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Ceph rados bench man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph rbd bench documentation: https://docs.ceph.com/en/latest/man/8/rbd/
- Podman search documentation: https://docs.podman.io/en/latest/markdown/podman-search.1.html

## Issues Found
No technical issues found.

## Review Notes
- The Rook operator version `v1.17.0-alpha.0` and Ceph version `v19.1.0-rc1` are illustrative examples. Readers should check for the actual current RC versions available at the time of testing.
- The `podman search --list-tags` command is podman-specific and will not work with Docker CLI. Readers using Docker would need `skopeo list-tags` or similar tooling instead.
- The post correctly identifies the ceph-users mailing list and Ceph tracker as the appropriate channels for reporting RC test results.
