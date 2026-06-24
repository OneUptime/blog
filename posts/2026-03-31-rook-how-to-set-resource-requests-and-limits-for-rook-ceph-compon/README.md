# How to Set Resource Requests and Limits for Rook-Ceph Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Resource Management, Kubernetes, Performance

Description: Learn how to configure CPU and memory resource requests and limits for Rook-Ceph components (MON, MGR, OSD, MDS, RGW) in the CephCluster CRD.

---

## Why Resource Management Matters for Ceph

Without resource requests and limits, Ceph daemon pods can:
- Starve other workloads by consuming all node CPU
- Be OOM-killed by Kubernetes when memory pressure occurs
- Not be scheduled properly due to missing resource hints

Proper resource configuration ensures Ceph daemons are scheduled predictably, protected from eviction, and do not monopolize node resources.

## Resource Configuration Structure

Core daemon resources (MON, MGR, OSD) are configured in the `CephCluster` spec under the `resources` key:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  resources:
    mgr:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
    mon:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
    osd:
      requests:
        cpu: "1"
        memory: "4Gi"
      limits:
        cpu: "2"
        memory: "8Gi"
    mgr-sidecar:
      requests:
        cpu: "100m"
        memory: "40Mi"
      limits:
        cpu: "500m"
        memory: "100Mi"
```

MDS and RGW resources are configured in their own CRDs (`CephFilesystem` and `CephObjectStore` respectively), not in the `CephCluster` resource.

## Per-Component Guidelines

### MON (Monitor) Resources

Monitors run a RocksDB store for cluster state. Memory requirements depend on PG count:

```yaml
mon:
  requests:
    cpu: "250m"     # Low CPU at idle, bursts during elections
    memory: "1Gi"   # For clusters with <1000 PGs
  limits:
    cpu: "1"
    memory: "2Gi"   # For clusters with <10000 PGs
```

For large clusters (10000+ PGs):

```yaml
mon:
  limits:
    memory: "4Gi"
```

### OSD Resources

OSDs are the most resource-intensive component. Each OSD process needs memory for its RocksDB cache:

```yaml
osd:
  requests:
    cpu: "500m"
    memory: "2Gi"   # Minimum for a small OSD
  limits:
    cpu: "2"
    memory: "8Gi"   # For a 1-4Ti OSD
```

The OSD memory target is configurable in Ceph:

```bash
# Set OSD memory target (Ceph-level, not resource limit)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_memory_target 4294967296  # 4Gi per OSD
```

The Kubernetes memory limit should be higher than `osd_memory_target` (add 25-50% buffer).

### MGR Resources

```yaml
mgr:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "1"
    memory: "1Gi"
```

If using the Prometheus module or many dashboard users, increase memory limits.

### MDS (CephFS Metadata Server) Resources

MDS resources are configured in the `CephFilesystem` CRD under `spec.metadataServer.resources`, not in the `CephCluster` CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2"
        memory: "4Gi"   # Larger clusters benefit from more cache
```

MDS caches filesystem metadata. More cache = better CephFS performance.

### RGW (Object Storage Gateway) Resources

RGW resources are configured in the `CephObjectStore` CRD under `spec.gateway.resources`, not in the `CephCluster` CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 2
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "2"
        memory: "2Gi"   # Scale up for high request rates
```

## Development vs Production Presets

### Development/Testing (Minimal Resources)

```yaml
resources:
  mgr:
    requests:
      cpu: "125m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  mon:
    requests:
      cpu: "125m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  osd:
    requests:
      cpu: "250m"
      memory: "512Mi"
    limits:
      cpu: "500m"
      memory: "2Gi"
```

### Production (Recommended)

```yaml
resources:
  mgr:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2"
      memory: "2Gi"
  mon:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
  osd:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "12Gi"
```

## Monitoring Actual Resource Usage

```bash
# Check current resource usage of Ceph pods
kubectl -n rook-ceph top pods | sort -k3 -hr | head -20

# Check for OOM kills
kubectl -n rook-ceph get events | grep -i oomkill

# Check resource requests vs limits in detail
kubectl -n rook-ceph describe pod <osd-pod> | grep -A4 "Limits\|Requests"
```

## Updating Resources on a Running Cluster

Resource changes trigger pod restarts for affected daemons:

```bash
# Update the CephCluster resource configuration
kubectl -n rook-ceph edit cephcluster rook-ceph
# Change resources section and save

# Watch for rolling restarts
kubectl -n rook-ceph get pods -w
```

## Summary

Resource requests and limits for core Rook-Ceph components (mon, mgr, osd) are configured under `spec.resources` in the `CephCluster` CRD. MDS resources are configured in the `CephFilesystem` CRD under `spec.metadataServer.resources`, and RGW resources in the `CephObjectStore` CRD under `spec.gateway.resources`. Set requests to ensure proper scheduling and limits to protect the node from memory exhaustion. OSD memory limits should be at least 25% higher than the Ceph `osd_memory_target` setting. Monitor actual resource usage with `kubectl top pods` and adjust based on observed consumption rather than fixed formulas.
