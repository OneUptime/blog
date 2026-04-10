# How to Configure mTLS Between Ceph and Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, mTLS, Service Mesh, Security, Kubernetes, TLS

Description: Learn how to configure mutual TLS between Ceph RGW endpoints and service mesh components to secure storage traffic without disrupting internal Ceph protocols.

---

## mTLS Scope for Ceph in Service Mesh

Mutual TLS (mTLS) in a service mesh context applies to traffic between pods within the mesh. For Ceph, the practical application of mTLS is:

- Application pods (in the mesh) connecting to Ceph RGW (S3 API) - use mTLS
- Application pods connecting to Ceph via CSI (block/file) - handled at kernel level, not mesh
- Ceph internal traffic (OSD-to-OSD, MON, MDS) - should be outside the mesh

## Setting Up mTLS for RGW Access

When application namespaces enforce strict mTLS, the rook-ceph namespace needs to accept mTLS connections. Configure PeerAuthentication in strict mode for application namespaces:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: my-app
spec:
  mtls:
    mode: STRICT
```

For the rook-ceph namespace hosting RGW, use permissive mode to accept both mTLS and plaintext:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: rook-ceph-permissive
  namespace: rook-ceph
spec:
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    80:
      mode: PERMISSIVE
    443:
      mode: STRICT
```

## Enabling TLS on the RGW Service

Configure Ceph RGW to use TLS directly, independent of the service mesh:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    securePort: 443
    instances: 1
    sslCertificateRef: rgw-tls-secret
```

Create the TLS secret from cert-manager or a manual certificate:

```bash
kubectl -n rook-ceph create secret tls rgw-tls-secret \
  --cert=tls.crt \
  --key=tls.key
```

## Creating AuthorizationPolicy for RGW

Control which services can access RGW using Istio AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-app-to-rgw
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: rook-ceph-rgw
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/my-app/sa/my-app-serviceaccount
    to:
    - operation:
        ports:
        - "80"
        - "443"
```

## Verifying mTLS is Working

Check that connections from application pods to RGW use mTLS:

```bash
# Check that the sidecar proxy is injected
istioctl x check-inject -n my-app deployment/my-app

# Verify listener configuration for RGW connectivity
istioctl proxy-config listeners deploy/my-app -n my-app | grep rgw
```

## Troubleshooting mTLS Issues

Common mTLS failures when accessing RGW:

```bash
# Check for RBAC/mTLS errors in sidecar logs
kubectl -n my-app logs deploy/my-app -c istio-proxy | grep -E "rbac|denied|upstream"

# Temporarily set RGW namespace to PERMISSIVE to isolate mTLS issues
kubectl apply -f - <<'EOF'
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: debug-permissive
  namespace: rook-ceph
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

## Summary

mTLS between service mesh applications and Ceph is best achieved by keeping Ceph internals outside the mesh while enabling permissive or strict mTLS on the RGW-facing ports. Use Istio PeerAuthentication to define mTLS modes per namespace, AuthorizationPolicy to restrict which services can access RGW, and native RGW TLS for end-to-end encryption. This layered approach provides strong security without compromising Ceph's internal communication protocols.
