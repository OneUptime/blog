# How to Set Up Auto-Scaling for Ceph RGW Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Auto-Scaling, Kubernetes

Description: Learn how to configure horizontal pod autoscaling for Ceph RGW instances to handle variable object storage workloads efficiently.

---

Ceph RGW (RADOS Gateway) is the S3-compatible object storage gateway. Traffic to RGW can vary significantly - from quiet overnight periods to peak daytime loads. Auto-scaling RGW instances allows the cluster to handle traffic spikes without over-provisioning permanently.

## How RGW Scaling Works

RGW is stateless at the gateway layer - each instance connects to the same Ceph cluster. You can run multiple RGW instances behind a load balancer and scale them independently of the underlying Ceph storage.

## Rook RGW Instance Count

Set the base instance count in the CephObjectStore:

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
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "2"
        memory: "2Gi"
```

## Setting Up Horizontal Pod Autoscaler

Rook creates a Deployment for RGW instances. Apply an HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rook-ceph-rgw-hpa
  namespace: rook-ceph
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rook-ceph-rgw-my-store-a
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
```

## Custom Metrics for RGW Scaling

Scale based on request rate using Prometheus adapter. Note that `ceph_rgw_qps` is not a built-in Ceph metric - you need to create a Prometheus recording rule (e.g., `rate(ceph_rgw_req[5m])`) and expose it through the Prometheus adapter:

```yaml
- type: External
  external:
    metric:
      name: ceph_rgw_qps
      selector:
        matchLabels:
          zone: my-store
    target:
      type: AverageValue
      averageValue: "1000"  # Scale at 1000 RPS per pod
```

## Load Balancing RGW Instances

Create a Kubernetes Service to load balance across RGW pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-lb
  namespace: rook-ceph
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-rgw
    rgw: my-store
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8443
```

## Monitoring Autoscaler Activity

```bash
kubectl -n rook-ceph get hpa rook-ceph-rgw-hpa
kubectl -n rook-ceph describe hpa rook-ceph-rgw-hpa
```

Watch scaling events:

```bash
kubectl -n rook-ceph get events --sort-by=.lastTimestamp | grep -i scale
```

## Prometheus Metrics for RGW Load

Key metrics to watch:

```promql
# RGW request rate
rate(ceph_rgw_req[5m])

# RGW daemon metadata (identity and version info)
ceph_rgw_metadata

# CPU per RGW pod
rate(container_cpu_usage_seconds_total{container="rgw"}[5m])
```

## Summary

Auto-scaling Ceph RGW instances using Kubernetes HPA allows object storage capacity to flex with actual traffic. Setting appropriate CPU and memory targets with conservative scale-down stabilization windows prevents thrashing. Combining CPU-based autoscaling with custom request-rate metrics provides more precise scaling that directly reflects S3 workload demands.
