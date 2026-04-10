# Validation Summary: How to Configure mTLS Between Ceph and Service Mesh

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph Operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Istio Service Mesh (PeerAuthentication, AuthorizationPolicy)
- Mutual TLS (mTLS)
- Kubernetes Secrets (TLS type)
- istioctl CLI
- kubectl CLI

## Sources Consulted
- Istio PeerAuthentication Reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy Reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio v1 APIs blog post (v1beta1 to v1 migration): https://istio.io/latest/blog/2024/v1-apis/
- Istio check-inject diagnostic tool: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio proxy-config diagnostic tool: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- kubectl create secret tls: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
1. **Misleading comment on `istioctl x check-inject` command**: The original comment said "Using istioctl to verify mTLS status", but `istioctl x check-inject` verifies sidecar injection, not mTLS status. Changed to "Check that the sidecar proxy is injected" to accurately describe the command's purpose. Also updated the second comment from "Verify connection between app and RGW" to "Verify listener configuration for RGW connectivity" for clarity.

## Review Notes
- The Istio resources use `security.istio.io/v1beta1`. As of Istio 1.22+, `security.istio.io/v1` is available and preferred. The v1beta1 version is still supported with no announced deprecation timeline, so the post remains correct but may want updating in the future.
- The `portLevelMtls` field uses workload port numbers, not Kubernetes Service port numbers. The post uses ports 80 and 443 which aligns with the RGW gateway `port` and `securePort` settings, so this is correct.
- All Rook CephObjectStore fields (`metadataPool`, `dataPool`, `gateway.port`, `gateway.securePort`, `gateway.instances`, `gateway.sslCertificateRef`) are verified correct against official Rook CRD documentation.
- The `app: rook-ceph-rgw` label used in the AuthorizationPolicy selector is the correct label applied by Rook to RGW pods.
- The conceptual guidance about keeping Ceph internal traffic (OSD, MON, MDS) outside the service mesh while only exposing RGW to mTLS is sound architectural advice.
