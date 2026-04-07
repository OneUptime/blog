# Validation Summary: How to Troubleshoot Rook-Ceph CSI Common Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (CSI driver integration)
- Kubernetes (CSI, PV/PVC, DaemonSets, Secrets)
- Ceph (RBD, CephFS)
- Helm

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook Helm chart values reference: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Kubernetes CSI documentation: https://kubernetes-csi.github.io/docs/
- Kubernetes API reference for resource specifications: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#resources
- Ceph documentation on RBD image features: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/

## Issues Found

1. **Issue 4 - Wrong secret field checked for CephFS key verification**: The post used `jsonpath='{.data.adminID}'` to verify a "valid Ceph keyring," but `adminID` contains the Ceph user ID (e.g., "admin"), not the authentication key. Changed to `adminKey` which contains the actual Ceph authentication key. Also updated the description from "valid Ceph keyring" to "valid Ceph key" for precision.

2. **Issue 6 - Incorrect Kubernetes resource field name**: The CSI plugin resource configuration used `resource` (singular) but Kubernetes container specs require `resources` (plural). Changed `resource:` to `resources:` in the YAML snippet.

## Review Notes
- The advice to remove PV finalizers (Issue 3) is correct but should be used with caution - removing finalizers bypasses CSI cleanup and can leave orphaned RBD images. The post does mention manual RBD image cleanup, which is good.
- The `exclusive-lock` feature advice (Issue 5) is nuanced: modern kernels (5.4+) support most RBD features. The advice is valid for older kernels but could mention the kernel version threshold.
- The Helm repo name `rook-release` is correct for the official Rook Helm repository.
