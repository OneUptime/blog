# How to Get Started with librados (Introduction)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, librados, RADOS, Storage API

Description: Learn the fundamentals of librados, the native Ceph client library that provides direct access to RADOS object storage for building Ceph-integrated applications.

---

librados is the native client library for Ceph's RADOS (Reliable Autonomic Distributed Object Store) layer. It provides the lowest-level access to Ceph storage, enabling applications to read and write objects directly to storage pools without going through higher-level interfaces like RBD or CephFS.

## What is RADOS?

RADOS is the foundation of Ceph. Every piece of data - whether a block device image, a file system chunk, or an S3 object - is ultimately stored as RADOS objects in pools. librados gives you direct access to this layer with:

- Synchronous and asynchronous object operations
- Atomic transactions (compare-and-swap, read-modify-write)
- Object-level extended attributes (xattrs) and key-value maps (omap)
- Watch/notify for distributed coordination
- Custom object classes (server-side code execution)

## Key Abstractions

| Concept       | Description                                      |
|---------------|--------------------------------------------------|
| Cluster handle | Connection to the Ceph cluster                  |
| Pool          | Named collection of objects (like a bucket)      |
| IoCtx         | I/O context for operations against a pool        |
| Object        | Named, variable-length byte sequence             |
| Xattr         | Extended attribute (key-value metadata)          |
| Omap          | Per-object key-value store (sorted)              |

## Available Language Bindings

librados ships with official bindings for:

- **C** - `librados.h` - lowest-level, maximum control
- **C++** - `librados/librados.hpp` - object-oriented wrapper
- **Python** - `rados` module via `python3-rados` package

## Installing librados

```bash
# On Ubuntu/Debian
sudo apt install librados-dev python3-rados

# On RHEL/CentOS
sudo dnf install librados-devel python3-rados
```

## Core Operation Flow

Every librados application follows the same pattern:

1. Create a cluster handle
2. Read the Ceph configuration
3. Connect to the cluster
4. Open an I/O context for a pool
5. Perform object operations
6. Close the I/O context and cluster handle

This flow is consistent across all language bindings, making it easy to translate examples between C, C++, and Python.

## Connection Configuration

librados reads the Ceph configuration from the default location or an explicit path:

```bash
# Default config location
/etc/ceph/ceph.conf

# Alternative: pass a config string
# [global]
# mon host = 192.168.1.10:6789,192.168.1.11:6789,192.168.1.12:6789
# auth cluster required = cephx
# keyring = /etc/ceph/ceph.client.admin.keyring
```

## Checking Connectivity

Test that your environment can reach the Ceph cluster before writing code:

```bash
rados -p mypool ls
rados -p mypool put testobj /etc/hostname
rados -p mypool get testobj /tmp/retrieved
```

## Summary

librados is the direct access layer to Ceph's RADOS storage, providing C, C++, and Python bindings for reading and writing objects, managing metadata through xattrs and omap, and executing custom server-side logic through object classes. All librados applications follow the same connect-then-operate pattern, making the library approachable once you understand its core abstractions.
