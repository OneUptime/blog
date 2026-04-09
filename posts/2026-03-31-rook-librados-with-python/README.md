# How to Use librados with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, librados, Python, RADOS

Description: Learn how to use the Python rados module to connect to a Ceph cluster and perform object read, write, list, and metadata operations from Python scripts.

---

The Python `rados` module provides a Pythonic interface to librados, making it straightforward to integrate Ceph object storage into Python applications, automation scripts, and data pipelines.

## Installation

```bash
# Ubuntu/Debian
sudo apt install python3-rados

# RHEL/CentOS
sudo dnf install python3-rados

```

## Connecting to the Cluster

```python
import rados

# Create cluster handle using default admin user
cluster = rados.Rados(conffile="/etc/ceph/ceph.conf")
cluster.connect()

print(f"Cluster ID: {cluster.get_fsid()}")
print(f"librados version: {cluster.version()}")
```

## Writing and Reading Objects

```python
import rados

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        # Write an object
        ioctx.write_full("mykey", b"Hello from Python!")
        print("Write successful")

        # Read the object back
        data = ioctx.read("mykey")
        print(f"Read: {data.decode()}")

        # Check object size and modification time
        size, mtime = ioctx.stat("mykey")
        print(f"Size: {size} bytes, Modified: {mtime}")
```

The `with` statement automatically handles connection and I/O context cleanup.

## Listing Objects in a Pool

```python
with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        objects = list(ioctx.list_objects())
        for obj in objects:
            print(f"Object: {obj.key}, Size: {ioctx.stat(obj.key)[0]}")
```

## Working with Extended Attributes

```python
with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        ioctx.write_full("myfile", b"content")

        # Set extended attributes
        ioctx.set_xattr("myfile", "content-type", b"text/plain")
        ioctx.set_xattr("myfile", "author", b"alice")

        # Read extended attributes
        ct = ioctx.get_xattr("myfile", "content-type")
        print(f"Content-Type: {ct.decode()}")
```

## Working with Omap (Key-Value Store)

Each object has an associated key-value store called omap:

```python
import rados

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        # Write omap entries using a write operation
        with rados.WriteOpCtx() as write_op:
            ioctx.set_omap(write_op, ("status", "created"), (b"active", b"2026-03-31"))
            ioctx.operate_write_op(write_op, "myobj")

        # Read omap entries using a read operation
        with rados.ReadOpCtx() as read_op:
            omap_iter, ret = ioctx.get_omap_vals(read_op, "", "", 100)
            ioctx.operate_read_op(read_op, "myobj")
            for key, val in omap_iter:
                print(f"  {key}: {val.decode()}")
```

## Deleting Objects

```python
with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        ioctx.remove_object("mykey")
        print("Object removed")
```

## Error Handling

```python
import rados

try:
    with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
        with cluster.open_ioctx("nonexistent-pool") as ioctx:
            pass
except rados.ObjectNotFound as e:
    print(f"Pool not found: {e}")
except rados.Error as e:
    print(f"RADOS error: {e}")
```

## Summary

The Python `rados` module wraps librados with context managers for clean resource handling, `bytes`-based data I/O, and straightforward methods for writing, reading, listing, and deleting objects. Extended attributes and omap provide per-object metadata storage, making Python an excellent choice for scripting Ceph storage workflows.
