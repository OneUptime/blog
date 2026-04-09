# How to Navigate the Ceph Dashboard Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Monitoring, Storage

Description: A guided tour of the Ceph Dashboard web interface sections, showing how to navigate between cluster health, pools, OSDs, and storage services.

---

## Overview

The Ceph Dashboard is a web-based management interface built into the Ceph Manager (MGR). It provides real-time cluster monitoring, resource management, and configuration without requiring command-line access. This guide covers the main navigation areas.

## Access the Ceph Dashboard via Rook

Get the dashboard service endpoint:

```bash
# Get the dashboard service
kubectl -n rook-ceph get svc rook-ceph-mgr-dashboard

# Port-forward for local access
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
```

Access at `https://localhost:8443`. Get the admin credentials:

```bash
# Get admin password (set by Rook)
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath='{.data.password}' | base64 --decode
```

## Main Navigation Sections

The left sidebar contains these primary sections:

**Dashboard** - Overview panel showing:
- Cluster status (HEALTH_OK / HEALTH_WARN / HEALTH_ERR)
- Capacity used vs available
- Active OSDs, MONs, MGRs
- Read/write IOPS and throughput graphs

**Cluster** - Infrastructure management:
- Hosts - physical nodes in the cluster
- Physical Disks - raw device inventory
- OSDs - object storage daemons
- MONs - monitor daemons
- Services - all Ceph service types

**Pools** - Storage pool management:
- List all pools with replication and PG info
- Create, edit, delete pools
- View per-pool I/O statistics

**Block** - RBD management:
- Images - list and manage RBD block images
- Namespaces - RBD namespaces within pools
- Mirroring - cross-cluster RBD mirroring

**NFS** - NFS Ganesha exports
**Object Gateway** - RGW buckets, users, and keys
**File Systems** - CephFS filesystems and MDS

## Dashboard URL Structure

```yaml
https://dashboard-host:8443/#/dashboard     - Main overview
https://dashboard-host:8443/#/hosts         - Cluster hosts
https://dashboard-host:8443/#/osd           - OSD management
https://dashboard-host:8443/#/pool          - Pool management
https://dashboard-host:8443/#/block/rbd     - RBD images
https://dashboard-host:8443/#/cephfs        - CephFS
https://dashboard-host:8443/#/rgw/bucket    - Object buckets
```

## Enable Dashboard via Rook

Ensure the dashboard is enabled in your CephCluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  dashboard:
    enabled: true
    ssl: true
    port: 8443
  mgr:
    modules:
      - name: prometheus
        enabled: true
```

## Configure External Access

Create an Ingress for external access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  rules:
    - host: ceph-dashboard.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rook-ceph-mgr-dashboard
                port:
                  number: 8443
```

## Summary

The Ceph Dashboard provides a comprehensive web interface for cluster monitoring and management. The left sidebar organizes functionality into Dashboard overview, Cluster infrastructure, Pools, Block (RBD), NFS, Object Gateway, and File Systems sections. Access via Rook requires port-forwarding the MGR dashboard service and retrieving the admin password from the Kubernetes secret.
