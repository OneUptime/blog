# How to Configure Ceph RGW for High Concurrent Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Scalability

Description: Configure Ceph RGW in Rook to handle thousands of concurrent connections by tuning frontend threads, RADOS handles, and Kubernetes resource limits.

---

## High Concurrency Challenges

When many applications connect to RGW simultaneously - CI/CD systems, microservices, data platforms - the gateway must handle thousands of concurrent HTTP connections without exhausting its thread pool or RADOS connection pool. Default settings are conservative and suitable for moderate loads only.

## Frontend Thread Pool Configuration

The Beast frontend uses an asynchronous model with a worker thread pool. Size it based on expected peak concurrent connections:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_frontends \
    "beast port=80 max_header_size=65536"

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 2048
```

Also increase the maximum number of connections the OS allows per process:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 4
    resources:
      requests:
        cpu: "8"
        memory: "16Gi"
      limits:
        cpu: "16"
        memory: "32Gi"
```

## RADOS Objecter Tuning

Increase the concurrent RADOS operation limits to prevent throttling under high connection counts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw objecter_inflight_ops 65536

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw objecter_inflight_op_bytes 536870912
```

## OS-Level Connection Limits

Raise file descriptor limits in the RGW pod. Configure via the Rook operator resource settings and a custom Kubernetes securityContext is not needed - the Rook operator handles this. Verify the limit inside the pod:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-rgw -o name | head -1) \
  -- cat /proc/sys/fs/file-max
```

Tune kernel TCP settings via a DaemonSet or node configuration:

```bash
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.core.netdev_max_backlog=65536
```

## Load Balancing Across RGW Instances

Use a Kubernetes Service to distribute connections across multiple RGW pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-my-store
  namespace: rook-ceph
spec:
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
  sessionAffinity: None
```

For higher connection counts, deploy an NGINX or HAProxy ingress in front of RGW:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rgw-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10g"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
    nginx.ingress.kubernetes.io/upstream-keepalive-connections: "1000"
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

## Monitoring Connections

Check active connections per RGW instance:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-rgw -o name | head -1) \
  -- ss -s
```

Review RGW metrics via Prometheus:

```text
ceph_rgw_req
ceph_rgw_failed_req
```

## Summary

Handling high concurrent connections in Ceph RGW requires increasing the Beast frontend thread pool, tuning RADOS objecter limits, and deploying multiple RGW instances behind a load balancer. OS-level TCP tuning on the nodes prevents connection drops at the kernel level under peak load.
