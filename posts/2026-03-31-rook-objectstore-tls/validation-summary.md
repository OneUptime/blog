# Validation Summary: How to Configure CephObjectStore Security with TLS in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Gateway (RGW)
- Kubernetes (Secrets, ConfigMaps, Deployments)
- cert-manager (Certificate lifecycle management)
- TLS/HTTPS
- AWS CLI (S3-compatible client)

## Sources Consulted
- [CephObjectStore CRD - Rook Ceph Documentation](https://rook.io/docs/rook/v1.11/CRDs/Object-Storage/ceph-object-store-crd/)
- [Object Storage Overview - Rook Ceph Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- [CephObjectStore CRD (GitHub master)](https://github.com/rook/rook/blob/master/Documentation/CRDs/Object-Storage/ceph-object-store-crd.md)
- [RGW SSL certificates are not reloaded after renewal/update - rook/rook#14069](https://github.com/rook/rook/issues/14069)
- [cert-manager Certificate resource documentation](https://cert-manager.io/docs/usage/certificate/)
- [kubectl rollout restart - Kubernetes Reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)
- [Add label selector in kubectl rollout commands - kubernetes/kubernetes#99758](https://github.com/kubernetes/kubernetes/pull/99758)

## Issues Found
No technical issues found. All CRD field names, configuration snippets, kubectl commands, and cert-manager resources are accurate per official documentation.

## Review Notes
- The `kubectl rollout restart deployment -n rook-ceph -l app=rook-ceph-rgw` command uses the `-l` (label selector) flag with `rollout restart`, which requires kubectl 1.31+ (beta) or 1.32+ (stable). By the blog's publication date this should be widely available, but readers on older kubectl versions would need to specify the deployment name explicitly (e.g., `kubectl rollout restart deployment/rook-ceph-rgw-my-store -n rook-ceph`).
- The Rook documentation notes that `caBundleRef` may also be needed alongside `sslCertificateRef` in scenarios where the RGW itself needs to trust a CA (e.g., multisite replication over TLS). This is not needed for basic TLS termination covered in this post, but could be worth mentioning in a future update for advanced use cases.
- Per rook/rook#14069, RGW pods do not automatically reload renewed TLS certificates. The blog correctly instructs users to restart RGW pods after certificate renewal. This is a known Rook limitation.
- The summary mentions clients should "present the correct CA certificate" — technically clients use the CA cert to *verify* the server certificate (not present it as in mTLS). The body of the post correctly uses `AWS_CA_BUNDLE` for server verification, so this is just a minor wording nuance in the summary paragraph.
