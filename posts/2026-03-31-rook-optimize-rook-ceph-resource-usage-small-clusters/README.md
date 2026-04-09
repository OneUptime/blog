# How to Optimize Rook-Ceph Resource Usage on Small Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Resource, Optimization, Storage

Description: Learn how to reduce CPU and memory consumption of Rook-Ceph on small clusters by tuning operator settings, OSD resources, and daemon configurations.

---

Running Rook-Ceph on a small cluster - such as a three-node homelab or a dev environment - can be resource-intensive if left at default settings. This guide shows practical ways to trim overhead without sacrificing stability.

## Limit Operator and Daemon Resources

The Rook operator itself can consume significant memory. Set resource requests and limits in the operator deployment:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"
```

Apply similar constraints to each Ceph daemon in your `CephCluster` manifest:

```yaml
spec:
  resources:
    mgr:
      requests:
        cpu: "100m"
        memory: "512Mi"
    mon:
      requests:
        cpu: "100m"
        memory: "256Mi"
    osd:
      requests:
        cpu: "200m"
        memory: "512Mi"
```

## Reduce Monitor Count

Three monitors is standard, but on a three-node cluster each node already hosts one. Avoid deploying extra mons by setting `count: 3` and enabling `allowMultiplePerNode: false`.

```yaml
spec:
  mon:
    count: 3
    allowMultiplePerNode: false
```

## Disable Unnecessary Modules

The Ceph Manager runs several modules by default. Disable those you do not need:

```bash
ceph mgr module disable pg_autoscaler
ceph mgr module disable crash
ceph mgr module disable prometheus   # if you use external metrics
```

## Tune OSD Memory Target

Each OSD has a memory target that defaults to 4 GiB. Lower it for small nodes:

```bash
ceph config set osd osd_memory_target 1073741824   # 1 GiB
```

Or via Rook's config override:

```yaml
spec:
  cephConfig:
    "osd.*":
      osd_memory_target: "1073741824"
```

## Use BlueStore Minimal Settings

The default BlueStore cache size is 1 GiB for HDD and 3 GiB for SSD. On small clusters with SSD-backed OSDs, reduce the SSD cache size:

```bash
ceph config set osd bluestore_cache_size_ssd 1073741824   # reduce from 3 GiB to 1 GiB
```

## Reduce Scrub Frequency

Scrubbing consumes IOPS and CPU. Increase the scrub interval to reduce background noise:

```bash
ceph config set osd osd_scrub_min_interval 604800    # 7 days
ceph config set osd osd_scrub_max_interval 2592000   # 30 days
```

## Summary

Optimizing Rook-Ceph on small clusters involves setting resource requests and limits on all daemons, reducing the OSD memory target, disabling unused manager modules, and tuning scrub intervals. These changes let Ceph coexist comfortably with workloads on nodes with limited CPU and RAM without changing replication or data safety settings.
