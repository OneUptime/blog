# How to Specify CRUSH Location (Root, Datacenter, Room, Row, Rack, Chassis, Host)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Storage, Configuration

Description: Learn how to specify CRUSH locations for OSDs in Ceph using the full hierarchy from root down to host, enabling precise failure domain control.

---

## What is a CRUSH Location

A CRUSH location is a key-value representation of where an OSD sits in the physical topology hierarchy. It tells Ceph which host, rack, row, datacenter, and root the OSD belongs to. Accurate CRUSH locations are essential for ensuring replicas are spread across real failure boundaries.

The location uses the format `type=name` pairs (the order of pairs does not matter):

```text
root=default datacenter=dc1 room=room1 row=row2 rack=rack3 chassis=chassis1 host=node-01
```

## Viewing Existing CRUSH Locations

```bash
# View the full CRUSH hierarchy
ceph osd tree

# Show CRUSH location for a specific OSD
ceph osd find 0

# Get full topology dump
ceph osd crush dump | python3 -m json.tool | grep -A5 '"name": "osd.0"'
```

Example output from `ceph osd find 0`:

```json
{
    "osd": 0,
    "ip": "192.168.1.10:6800",
    "crush_location": {
        "host": "ceph-node-01",
        "rack": "rack1",
        "root": "default"
    }
}
```

## Setting CRUSH Location via crush_location

Add CRUSH location to `ceph.conf` or set it per-OSD in Rook. For manual clusters:

```ini
[osd.0]
crush_location = root=default datacenter=dc1 rack=rack1 host=node-01
```

For Rook-managed clusters, set topology labels on Kubernetes nodes:

```bash
# Label nodes with topology information
kubectl label node node-01 topology.kubernetes.io/zone=us-east-1a
kubectl label node node-01 topology.rook.io/rack=rack1
kubectl label node node-01 topology.rook.io/datacenter=dc1
```

## Manually Placing an OSD in a Location

Use `ceph osd crush set` to assign a location directly:

```bash
# Place osd.0 in a specific rack and host
ceph osd crush set osd.0 1.0 root=default datacenter=dc1 rack=rack1 host=node-01

# Move an OSD to a different location
ceph osd crush set osd.0 1.0 root=default datacenter=dc2 rack=rack3 host=node-05
```

The `1.0` is the CRUSH weight, typically the OSD size in terabytes.

## Full Hierarchy Location Example

A three-datacenter deployment with racks per datacenter:

```bash
# Create datacenter buckets
ceph osd crush add-bucket dc1 datacenter
ceph osd crush add-bucket dc2 datacenter

# Create rack buckets under each datacenter
ceph osd crush add-bucket rack1 rack
ceph osd crush add-bucket rack2 rack

# Move racks under datacenters
ceph osd crush move rack1 datacenter=dc1
ceph osd crush move rack2 datacenter=dc2

# Move datacenters under the root
ceph osd crush move dc1 root=default
ceph osd crush move dc2 root=default

# Place a host in a rack
ceph osd crush move node-01 rack=rack1

# Verify the resulting hierarchy
ceph osd tree
```

## Verifying Failure Domain Spread

```bash
# Check that replicas are spread across hosts
ceph osd map mypool myobject

# Simulate PG placement and verify distribution
ceph pg map 1.a

# Show brief PG distribution across OSDs
ceph pg dump pgs_brief
```

## Summary

CRUSH locations are key-value pairs that define where each OSD sits in your physical topology hierarchy. Specify them via `crush_location` in ceph.conf, Kubernetes node labels in Rook, or directly with `ceph osd crush set`. Accurate location data ensures Ceph places replicas across real failure domains - different racks, rooms, or datacenters - providing genuine fault isolation.
