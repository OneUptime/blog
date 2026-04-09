# How to Set External RGW Endpoints in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Kubernetes

Description: Learn how to configure external RGW endpoints in Rook to expose your object store beyond the Kubernetes cluster via LoadBalancer services or Ingress.

---

## Why Configure External RGW Endpoints

By default, a Rook object store is only accessible within the Kubernetes cluster via a ClusterIP service. External clients - on-premises systems, external applications, or other clusters - cannot reach it.

External RGW endpoints solve this in two ways:
1. Configuring the RGW service as a `LoadBalancer` to get an external IP.
2. Exposing RGW through an ingress controller with a hostname.

Additionally, for multisite replication, the remote cluster needs to reach your RGW, making external endpoints a prerequisite.

## Option 1: LoadBalancer Service

Set `service.annotations` and `service.type` in the gateway spec:

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
    instances: 2
    service:
      type: LoadBalancer
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

Check the assigned external IP:

```bash
kubectl -n rook-ceph get service rook-ceph-rgw-my-store
```

The `EXTERNAL-IP` column shows the load balancer IP once provisioned.

## Option 2: Ingress Controller

Create an Ingress resource pointing to the RGW ClusterIP service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rgw-ingress
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  ingressClassName: nginx
  rules:
    - host: s3.mycompany.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rook-ceph-rgw-my-store
                port:
                  number: 80
  tls:
    - hosts:
        - s3.mycompany.com
      secretName: rgw-tls-cert
```

The `proxy-body-size: "0"` annotation disables body size limits, which is critical for large object uploads.

## Advertising External Endpoints for Multisite

When using multisite replication, register the external endpoint so the remote zone can reach this cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

radosgw-admin zone modify \
  --rgw-zone default \
  --endpoints http://s3.mycompany.com:80

radosgw-admin period update --commit
```

## Setting the advertiseEndpoint in CephObjectStore

For Rook to propagate the external address to the Ceph zone configuration automatically:

```yaml
gateway:
  port: 80
  instances: 2
  hosting:
    advertiseEndpoint:
      dnsName: s3.mycompany.com
      port: 80
      useTls: false
```

## Testing External Access

From an external system:

```bash
aws s3 ls --endpoint-url http://s3.mycompany.com \
  --no-verify-ssl
```

Or test the health endpoint:

```bash
curl http://s3.mycompany.com/
```

## Summary

External RGW endpoints in Rook are configured via LoadBalancer service annotations or an Ingress resource. For multisite setups, register the external address using `radosgw-admin zone modify` or the `hosting.advertiseEndpoint` field in the gateway spec. Configure ingress with `proxy-body-size: "0"` to allow large S3 uploads. Verify external access by running S3 CLI commands or HTTP requests from outside the cluster.
