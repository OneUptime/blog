# How to Use ceph-dencoder for Data Structure Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ceph-dencoder, Debugging, Data Structure, Analysis

Description: Use ceph-dencoder to encode, decode, and inspect Ceph internal data structures like OSD maps, monitor maps, and PG state in human-readable form.

---

## What is ceph-dencoder

`ceph-dencoder` is a utility that can encode and decode Ceph's internal binary data structures. It is used to inspect raw binary data extracted from the monitor store, OSD metadata, or network captures to understand Ceph's internal state during debugging.

## List Available Types

```bash
# See all data structure types ceph-dencoder understands
ceph-dencoder list_types

# Filter for commonly used types
ceph-dencoder list_types | grep -i "osdmap\|monmap\|pgmap\|auth"
```

## Decode a Monitor Map

```bash
# Extract monmap from a running cluster
ceph mon getmap -o /tmp/monmap.bin

# Decode to human-readable JSON
ceph-dencoder type MonMap import /tmp/monmap.bin decode dump_json

# Or decode to text format
ceph-dencoder type MonMap import /tmp/monmap.bin decode dump
```

## Decode an OSD Map

```bash
# Get the current OSD map
ceph osd getmap -o /tmp/osdmap.bin

# Decode and inspect
ceph-dencoder type OSDMap import /tmp/osdmap.bin decode dump_json | python3 -m json.tool | head -100

# Get a specific epoch
ceph osd getmap 100 -o /tmp/osdmap-epoch100.bin
ceph-dencoder type OSDMap import /tmp/osdmap-epoch100.bin decode dump_json
```

## Decode PG Map

```bash
ceph pg getmap -o /tmp/pgmap.bin
ceph-dencoder type PGMap import /tmp/pgmap.bin decode dump_json | python3 -m json.tool
```

## Inspect Auth Data

```bash
# Export auth keys (already human-readable text format)
ceph auth export client.admin -o /tmp/client.admin.keyring

# To decode binary auth data extracted from the monitor store:
ceph-dencoder type EntityAuth import /tmp/auth_entity.bin decode dump_json
```

## Encode a Modified Structure

```bash
# Decode to JSON for inspection
ceph-dencoder type MonMap import /tmp/monmap.bin decode dump_json > /tmp/monmap.json

# Note: ceph-dencoder cannot re-import modified JSON.
# To modify maps, use the dedicated tools instead:
#   monmaptool  - modify monitor maps
#   osdmaptool  - modify OSD maps
#   crushtool   - modify CRUSH maps
```

## Identify Data Structure Version

```bash
# Check the version encoding of a binary blob
ceph-dencoder type OSDMap import /tmp/osdmap.bin decode dump_json | \
  python3 -c "import json, sys; d=json.load(sys.stdin); print(d.get('epoch', 'N/A'))"
```

## Practical Debugging Example

```bash
# Debug: Compare OSD maps at two epochs to find when a change occurred
ceph osd getmap 150 -o /tmp/osdmap-150.bin
ceph osd getmap 151 -o /tmp/osdmap-151.bin

ceph-dencoder type OSDMap import /tmp/osdmap-150.bin decode dump_json | python3 -m json.tool > /tmp/epoch-150.json
ceph-dencoder type OSDMap import /tmp/osdmap-151.bin decode dump_json | python3 -m json.tool > /tmp/epoch-151.json

diff /tmp/epoch-150.json /tmp/epoch-151.json
```

## Summary

`ceph-dencoder` is an essential tool for Ceph developers and advanced operators who need to inspect raw binary data structures extracted from running clusters or recovery scenarios. By decoding monitor maps, OSD maps, and PG state into readable JSON, it enables precise debugging of cluster configuration changes and state transitions.
