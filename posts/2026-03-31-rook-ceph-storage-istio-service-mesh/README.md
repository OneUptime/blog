# How to Use Ceph Storage with Istio Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Istio, Service Mesh, Kubernetes, Storage, Networking

Description: Learn how to integrate Ceph Rook storage with Istio service mesh, handling sidecar injection exclusions, port configurations, and traffic policies for storage components.

---

## Challenges of Running Ceph with Istio

When Istio is deployed cluster-wide with automatic sidecar injection, it intercepts all pod traffic via the Envoy proxy. This causes problems for Ceph because:

- Ceph uses non-HTTP protocols that Istio may not handle correctly
- The Envoy sidecar adds latency to storage I/O paths
- OSD-to-OSD replication traffic gets unnecessarily proxied
- Port conflicts can occur between Ceph and Envoy

## Disabling Sidecar Injection for Rook Namespaces

The simplest and recommended approach is to exclude the `rook-ceph` namespace from Istio injection:

```bash
kubectl label namespace rook-ceph istio-injection=disabled
```

Verify the label:

```bash
kubectl get namespace rook-ceph --show-labels
```

This prevents Istio from intercepting Ceph internal traffic while still allowing applications in other namespaces to use sidecar-injected pods to access Ceph storage.

## Excluding Specific Pods from Injection

If you need Istio in the rook-ceph namespace for monitoring purposes but want to exclude storage pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: rook-ceph
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

## Configuring Istio Traffic Policies for RGW

If you expose Ceph RGW (S3 API) through Istio, create a VirtualService with appropriate timeout and retry settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ceph-rgw
  namespace: rook-ceph
spec:
  hosts:
  - rook-ceph-rgw-my-store
  http:
  - route:
    - destination:
        host: rook-ceph-rgw-my-store
        port:
          number: 80
    timeout: 300s
    retries:
      attempts: 3
      retryOn: 5xx
```

## Setting Up a Gateway for External RGW Access

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: ceph-rgw-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - s3.example.com
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ceph-rgw-vs
  namespace: rook-ceph
spec:
  hosts:
  - s3.example.com
  gateways:
  - istio-system/ceph-rgw-gateway
  http:
  - route:
    - destination:
        host: rook-ceph-rgw-my-store
        port:
          number: 80
```

## Handling mTLS for Application-to-Ceph Traffic

If Istio enforces strict mTLS in the application namespace, non-meshed clients (such as pods in namespaces without Istio injection) accessing Ceph services like RGW over the network will be rejected. Configure a PeerAuthentication exception for the rook-ceph namespace to allow both mTLS and plaintext traffic:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: rook-ceph-permissive
  namespace: rook-ceph
spec:
  mtls:
    mode: PERMISSIVE
```

## Summary

Running Ceph with Istio requires careful handling of sidecar injection and mTLS policies. The safest approach is to disable Istio injection for the `rook-ceph` namespace to prevent Envoy from interfering with Ceph's storage protocols. For exposing services like RGW externally, use Istio Gateway and VirtualService resources while keeping internal Ceph traffic outside the mesh. Set PeerAuthentication to PERMISSIVE mode to allow non-meshed clients to access Ceph services like RGW over the network.
