# How to Understand Ceph Replication (Primary OSD, Secondary, Acting Set, Up Set)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Replication, OSD, Storage, HighAvailability

Description: Learn how Ceph replication works through primary and secondary OSDs, acting sets, and up sets to ensure data durability across failures.

---

## Replication in Ceph

Ceph replication works at the placement group (PG) level. Every PG is assigned to a set of OSDs that together store all replicas of the objects in that PG. Understanding the roles of these OSDs - primary, secondary, acting set, and up set - is fundamental to diagnosing I/O issues and recovery operations.

## The Up Set vs Acting Set

### Up Set

The up set is the list of OSDs that CRUSH computes should store a PG based on the current OSD map and CRUSH rules. This is the desired state.

### Acting Set

The acting set is the list of OSDs that currently store the PG. Normally the acting set equals the up set. They diverge temporarily during recovery operations when not all up-set OSDs are ready.

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# Query PG state including up and acting sets
ceph pg 2.1e query | python3 -m json.tool | grep -A 5 '"up"'
```

Example output:

```json
{
  "up": [4, 11, 19],
  "acting": [4, 7, 19],
  "up_primary": 4,
  "acting_primary": 4
}
```

Here OSD 11 is in the up set but not the acting set - it may be recovering or temporarily unavailable.

## The Primary OSD

The first OSD in the acting set is the primary. All client reads and writes go to the primary OSD first. The primary is responsible for:

- Receiving the write from the client
- Forwarding the write to all secondary OSDs in the acting set
- Waiting for acknowledgment from all secondaries
- Replying to the client confirming durability

```bash
# Map an object to its primary OSD
kubectl exec -it rook-ceph-tools -n rook-ceph -- \
  ceph osd map replicapool my-object
```

Output:

```text
osdmap e42 pool 'replicapool' (2) object 'my-object' -> pg 2.f8c3e1e (2.1e) -> up ([4,11,19], p4) acting ([4,11,19], p4)
```

The `p4` indicates OSD 4 is the primary.

## Secondary OSDs

Secondary OSDs receive write forwarded by the primary. They write to their local BlueStore and acknowledge back to the primary. They do not communicate directly with the client.

With read balancing enabled (Ceph Reef+), the balancer can assign different OSDs as primary for different PGs to distribute read load:

```bash
# Enable read balancing (Ceph Reef+)
ceph balancer on
ceph balancer mode upmap-read
```

## Write Acknowledgment Modes

Ceph historically supported two write acknowledgment levels:

- **ack**: Client receives acknowledgment when the primary and a sufficient number of replicas (based on `min_size`) have written to journal/WAL
- **safe/ondisk**: Client receives acknowledgment when all replicas have flushed data from journal/WAL to the main data store

With BlueStore (default since Luminous and the only production store in modern Ceph), WAL writes are themselves durable, so `ack` and `ondisk` occur at the same time. The `ondisk` callback was deprecated in Nautilus. Modern Kubernetes workloads using RBD receive full durability at the `ack` level.

## Acting Set Changes and Peering

When an OSD fails, affected PGs enter the `peering` state. Monitors update the OSD map, and surviving OSDs negotiate a new acting set. Once peering completes, the PG becomes `active` again and recovery begins.

```bash
# Monitor PG peering and recovery
kubectl exec -it rook-ceph-tools -n rook-ceph -- ceph -w
```

## Summary

Ceph replication operates through a structured hierarchy of primary and secondary OSDs grouped into acting and up sets per placement group. The primary OSD coordinates all I/O for a PG, forwarding writes to secondaries and confirming durability to clients. Understanding the distinction between acting and up sets is critical for diagnosing recovery events, interpreting PG states, and ensuring your Rook-Ceph cluster maintains the data durability guarantees you expect.
