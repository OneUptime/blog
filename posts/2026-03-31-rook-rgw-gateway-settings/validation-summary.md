# Validation Summary: How to Configure RGW Gateway Settings (Port, SecurePort, Instances) in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Kubernetes (CRDs, kubectl, Services, Pods)
- S3-compatible object storage

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook gateway spec reference for `port`, `securePort`, `sslCertificateRef`, `instances`, `resources`, and `priorityClassName` fields
- Kubernetes PriorityClass documentation for `system-cluster-critical`

## Issues Found
No technical issues found.

## Review Notes
- All YAML snippets use correct field names and structure matching the `CephObjectStore` CRD spec (`ceph.rook.io/v1`).
- The `gateway` section fields (`port`, `securePort`, `sslCertificateRef`, `instances`, `resources`, `priorityClassName`) are all valid and correctly documented.
- The advice to set `securePort` only with `sslCertificateRef` is accurate — Rook requires a certificate reference for HTTPS termination at the gateway.
- The pod label selector `app=rook-ceph-rgw` and service naming convention `rook-ceph-rgw-<store-name>` are correct.
- The `kubectl patch` command with `--type merge` is syntactically correct for updating the instance count.
- The recommendation of 2+ instances for production and the note about rolling upgrades with 3+ instances are sound operational guidance.
- None.
