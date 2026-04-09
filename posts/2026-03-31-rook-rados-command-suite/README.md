# How to Use the rados Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RADOS, Object Storage, Kubernetes, Storage

Description: A practical guide to the rados command suite for interacting with Ceph object storage pools, including reading, writing, listing, and benchmarking objects.

---

## Overview

The `rados` command is the primary CLI tool for interacting directly with Ceph's RADOS (Reliable Autonomic Distributed Object Store) layer. It operates at a lower level than the RGW S3 API, letting you manipulate raw objects in any pool. In Rook deployments, you run `rados` from the Ceph toolbox pod.

## Setting Up the Toolbox

```bash
# Deploy the Rook toolbox if not already running
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml

# Exec into the toolbox
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
```

## Listing Pools and Objects

```bash
# List all available pools
rados lspools

# List objects in a specific pool
rados -p replicapool ls

# List objects in all namespaces
rados -p replicapool ls --all
```

## Reading and Writing Objects

```bash
# Write a file as a RADOS object
rados -p replicapool put myobject /tmp/testfile.txt

# Read an object back to a file
rados -p replicapool get myobject /tmp/retrieved.txt

# Write inline content
echo "hello ceph" > /tmp/hello.txt && rados -p replicapool put hello /tmp/hello.txt

# Delete an object
rados -p replicapool rm myobject
```

## Working with Object Attributes (xattrs)

```bash
# Set an extended attribute
rados -p replicapool setxattr myobject owner "teamA"

# Get an extended attribute
rados -p replicapool getxattr myobject owner

# List all xattrs on an object
rados -p replicapool listxattrs myobject

# Remove an xattr
rados -p replicapool rmxattr myobject owner
```

## Object Map (omap) Operations

RADOS omap is a per-object key-value store used internally by RGW and other Ceph services:

```bash
# Set an omap entry
rados -p replicapool setomapval myobject key1 value1

# Get an omap entry
rados -p replicapool getomapval myobject key1

# List all omap entries
rados -p replicapool listomapvals myobject
```

## Benchmarking with rados bench

```bash
# Write benchmark - 30 seconds, 4MB objects
rados -p replicapool bench 30 write --no-cleanup

# Sequential read benchmark
rados -p replicapool bench 30 seq

# Random read benchmark
rados -p replicapool bench 30 rand

# Clean up benchmark objects
rados -p replicapool cleanup
```

## Watching Object Changes

```bash
# Watch for changes to an object (useful for debugging)
rados -p replicapool watch myobject
```

## Copying Objects Between Pools

```bash
# Copy an object to another pool
rados -p sourcepool --target-pool destpool cp myobject myobject

# Copy all objects from one pool to another
rados cppool sourcepool destpool
```

## Checking Object Statistics

```bash
# Get stats for a specific object
rados -p replicapool stat myobject

# Output:
# replicapool/myobject mtime 2026-03-31T10:22:00.000000+0000, size 1024
```

## Summary

The `rados` command suite gives you direct access to Ceph's object layer for reading, writing, benchmarking, and managing objects and their metadata. Running these commands from the Rook toolbox pod provides a powerful debugging and maintenance interface for any Rook/Ceph deployment. It is essential for troubleshooting storage issues and validating cluster behavior at the lowest level.
