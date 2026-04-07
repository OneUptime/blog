# Validation Summary: How to Configure Rook-Ceph TLS for Secure Communication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephCluster, CephObjectStore, CephFilesystem CRDs)
- Kubernetes (kubectl, secrets, services)
- TLS / HTTPS
- cert-manager (Issuer, Certificate resources)
- Ceph msgr2 protocol (inter-daemon encryption)
- OpenSSL (self-signed certificate generation)
- Ceph Dashboard
- Ceph RGW (RADOS Gateway / S3 endpoint)

## Sources Consulted
- Rook-Ceph official documentation — CephCluster CRD spec (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook-Ceph official documentation — CephObjectStore CRD spec (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook-Ceph official documentation — CephFilesystem CRD spec (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Rook-Ceph official documentation — Network encryption (https://rook.io/docs/rook/latest/CRDs/Cluster/network-config/)
- cert-manager documentation (https://cert-manager.io/docs/)
- Ceph documentation — msgr2 protocol and encryption (https://docs.ceph.com/en/latest/rados/configuration/msgr2/)
- OpenSSL man pages for req command and -addext flag

## Issues Found
No technical issues found.

## Review Notes
- The `dashboard.port: 8443` with `ssl: true` is redundant since 8443 is the default SSL port for the Ceph Dashboard, but it is not incorrect and improves clarity for readers.
- The `-addext` flag in the OpenSSL command requires OpenSSL 1.1.1 or later; this is standard on modern systems but could be noted for users on older distributions.
- The `/api/health/ready` endpoint used in the Dashboard verification curl command may not exist in all Ceph Dashboard versions (common alternatives include `/api/health/minimal`), but any HTTPS request to the Dashboard will suffice to verify TLS is working.
- The post correctly notes that `-k` should be removed for production use with CA-signed certificates.
