# How to Use rados CLI for Object-Level Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RADOS, CLI, Debugging, Object Storage

Description: Use the rados CLI tool to read, write, list, and inspect objects directly in Ceph pools for low-level debugging and data recovery operations.

---

## Why rados CLI for Debugging

`rados` gives you direct access to objects stored in Ceph pools without going through higher-level interfaces like RBD or RGW. This makes it invaluable for verifying data placement, testing cluster health, and recovering objects during incidents.

## Basic Object Operations

```bash
# List objects in a pool
rados -p mypool ls

# Get a specific object
rados -p mypool get my-object /tmp/my-object-download

# Put an object
rados -p mypool put test-object /tmp/test-file.txt

# Delete an object
rados -p mypool rm test-object
```

## Benchmark Cluster Performance

```bash
# Write benchmark (60 seconds)
rados -p mypool bench 60 write --no-cleanup

# Sequential read benchmark
rados -p mypool bench 60 seq

# Random read benchmark
rados -p mypool bench 60 rand

# Cleanup after benchmarks
rados -p mypool cleanup
```

## Inspect Object Location

```bash
# Find which PG an object belongs to
ceph osd map mypool my-object

# Output shows: osdmap epoch, pg, up set, acting set
# e.g.: osdmap e100 pool 'mypool' (1) object 'my-object' -> pg 1.abc123 -> up ([2,0,1], p2) acting ([2,0,1], p2)
```

## Check Object Attributes and XAttrs

```bash
# Get extended attributes for an object
rados -p mypool getxattr my-object key

# List all xattrs
rados -p mypool listxattrs my-object

# Set an xattr
rados -p mypool setxattr my-object mykey myvalue

# Get object stat (size, mtime)
rados -p mypool stat my-object
```

## List Objects in a Specific PG

```bash
# List objects from a specific placement group
rados -p mypool --pgid 1.0 ls

# Useful for investigating inconsistencies reported by deep-scrub
ceph health detail | grep inconsistent
rados -p mypool --pgid 1.0 ls | wc -l
```

## Monitor Object Write/Read in Real Time

```bash
# Watch for RADOS notifications on an object
rados -p mypool watch my-object &

# Send a notification to trigger the watch
rados -p mypool notify my-object ""
```

## Verify Object Existence Across Replicas

```bash
# Check that an object is on all expected OSDs
OBJ_PG=$(ceph osd map mypool my-object 2>&1 | grep "pg " | awk '{print $10}')
echo "Object is in PG: $OBJ_PG"

# List acting OSDs for this PG
ceph pg $OBJ_PG query | python3 -m json.tool | grep -A5 '"acting"'
```

## Summary

The `rados` CLI provides direct object-level access to Ceph pools, making it the right tool for verifying data placement, benchmarking raw cluster performance, and recovering specific objects during incidents. Its ability to map objects to PGs and OSDs helps trace exactly where data lives and diagnose replication or inconsistency problems.
