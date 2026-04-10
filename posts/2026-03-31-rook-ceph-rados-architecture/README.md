# How to Understand the Ceph RADOS Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RADOS, Architecture, Storage, Kubernetes

Description: Explore the Ceph RADOS layer - the distributed object store at the heart of Ceph that powers block, file, and object storage.

---

## What Is RADOS

RADOS (Reliable Autonomic Distributed Object Store) is the foundational storage layer of Ceph. Every higher-level abstraction in Ceph - RBD block devices, CephFS filesystems, and RGW object storage - ultimately stores data as objects within RADOS. Understanding RADOS is essential for diagnosing performance issues, planning capacity, and operating Rook-Ceph clusters effectively.

## Core Components

RADOS consists of three primary daemon types:

- **Monitors (MON)**: Maintain the authoritative cluster map, including the CRUSH map, OSD map, and PG map. All clients consult monitors to locate data.
- **OSDs (Object Storage Daemons)**: Store objects on physical media. Each OSD also handles replication, recovery, backfill, and heartbeat monitoring.
- **Managers (MGR)**: Collect metrics and host modules such as the dashboard and Prometheus exporter.

In a Rook deployment, each of these maps to a Kubernetes pod managed by the Rook operator.

## How Clients Locate Objects

Ceph clients never contact a central metadata server to find an object. Instead, they compute the object location using the CRUSH algorithm:

```text
object_name -> hash -> pool PG -> CRUSH map -> OSD list
```

A client retrieves the current cluster map from monitors, then computes which OSD holds a given object locally. This scales linearly because no lookup service is involved.

## Inspecting the Cluster Map with Rook

Use the Rook toolbox to explore RADOS internals:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash
```

View the OSD map:

```bash
ceph osd dump
```

View pool and placement group status:

```bash
ceph pg stat
ceph pg dump | head -20
```

List raw objects in a pool:

```bash
rados -p replicapool ls | head -20
```

## Object Layout in RADOS

Every RADOS object has:
- A pool identifier
- An object name (up to 4096 characters)
- Byte-addressable data payload
- Extended attributes (xattrs) - small key-value metadata
- OMap - larger key-value storage for structured metadata used by RGW and CephFS

Inspect an object directly:

```bash
rados -p replicapool stat <object-name>
rados -p replicapool getxattr <object-name> <attr-key>
```

## Write Path in RADOS

When a client writes an object:

1. The primary OSD receives the write.
2. The primary writes to its local BlueStore WAL and forwards the write to all replica OSDs in the acting set.
3. Each replica writes to its BlueStore WAL and acknowledges to the primary.
4. Once the primary and all replicas have committed the write durably, the primary replies to the client.

```bash
# Check acting set for a specific PG
ceph pg <pgid> query | python3 -m json.tool | grep -A 5 acting
```

## Recovery and Self-Healing

RADOS is designed to recover autonomously. When an OSD fails, its peers detect the failure through missed heartbeats, report it to monitors, and begin re-replicating affected objects to other OSDs.

Monitor recovery state:

```bash
ceph health detail
ceph osd tree
ceph -w
```

## Summary

RADOS is a fully distributed, self-healing object store that forms the backbone of all Ceph storage services. It uses a combination of consistent hashing (CRUSH), distributed cluster maps, and autonomous OSD coordination to deliver scalable, reliable storage without central metadata bottlenecks. When operating Rook-Ceph, understanding RADOS helps you interpret cluster health, diagnose slow I/O, and plan for failure scenarios.
