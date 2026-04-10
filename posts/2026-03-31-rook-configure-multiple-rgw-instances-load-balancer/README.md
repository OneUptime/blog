# How to Configure Multiple RGW Instances Behind a Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Load Balancer, High Availability, Kubernetes

Description: Learn how to deploy multiple Ceph RGW instances behind a load balancer for horizontal scaling and high availability in a Rook-managed cluster.

---

Running a single RGW instance creates a bottleneck and a single point of failure for object storage traffic. By deploying multiple RGW instances behind a load balancer, you can distribute requests evenly and ensure availability during rolling updates or instance failures.

## Configure Multiple RGW Instances in Rook

The `CephObjectStore` resource controls the number of RGW replicas. Set the `instances` field under `gateway`:

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
    instances: 3
    resources:
      limits:
        cpu: "2"
        memory: "2Gi"
      requests:
        cpu: "500m"
        memory: "1Gi"
```

Apply the configuration:

```bash
kubectl apply -f object-store.yaml
```

Verify that all three RGW pods are running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-rgw
```

## Expose RGW Behind a Kubernetes LoadBalancer Service

Rook creates a ClusterIP service by default. To expose RGW externally, patch the service or define an Ingress:

```bash
kubectl -n rook-ceph patch svc rook-ceph-rgw-my-store \
  -p '{"spec": {"type": "LoadBalancer"}}'
```

Or use an NGINX Ingress for more control:

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
  rules:
  - host: s3.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-my-store
            port:
              number: 80
```

## Distribute Instances Across Nodes

Use `podAntiAffinity` to ensure RGW pods run on separate nodes:

```yaml
gateway:
  instances: 3
  placement:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - rook-ceph-rgw
        topologyKey: kubernetes.io/hostname
```

## Verify Load Distribution

Use the `radosgw-admin` tool to check per-instance usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin usage show --show-log-entries=false
```

Monitor request counts with Prometheus queries:

```bash
rate(ceph_rgw_req[5m])
```

## Summary

Deploying multiple RGW instances with proper pod anti-affinity rules ensures both horizontal scalability and fault tolerance for Ceph object storage. Pairing a Kubernetes LoadBalancer service or Ingress with three or more replicas provides a production-ready S3-compatible endpoint that survives individual instance failures.
