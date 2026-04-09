# How to Perform Direct Object Access with librados

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, librados, Object Storage, RADOS

Description: Learn how to perform direct object access operations with librados including partial reads, offset writes, object stats, and atomic compare-and-swap operations.

---

librados provides fine-grained control over object access that goes beyond simple read/write. Understanding partial reads, offset-based writes, atomic operations, and object introspection enables you to build efficient, high-performance applications on Ceph.

## Partial Reads and Offset Writes

Unlike file systems, RADOS objects support random access by offset:

```python
import rados

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        # Write a 100-byte object
        ioctx.write_full("bigobj", b"A" * 50 + b"B" * 50)

        # Read only the second half (offset=50, length=50)
        partial = ioctx.read("bigobj", length=50, offset=50)
        print(f"Partial read: {partial[:10]}...")  # b'BBBBBBBBBB'

        # Write at an offset (overwrites in-place)
        ioctx.write("bigobj", b"C" * 20, offset=25)
```

## Object Statistics

Get the size and last modification time of an object:

```python
size, mtime = ioctx.stat("myobj")
print(f"Size: {size} bytes")
print(f"Modified: {mtime}")
```

## Appending to Objects

Append data to the end of an existing object without knowing its current size:

```python
ioctx.append("logobj", b"New log line\n")
```

## Truncating Objects

Reduce or expand an object to a specific size:

```python
ioctx.trunc("bigobj", 100)  # Truncate to 100 bytes
```

## Atomic Compare-and-Swap Operations

Use `WriteOp` with `assert_version` for atomic conditional writes. This ensures the write only succeeds if the object has not been modified since you last read it:

```python
import rados

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        # Set initial value
        ioctx.write_full("counter", b"5")

        # Read current version
        ioctx.stat("counter")
        ver = ioctx.get_last_version()

        # Atomic write: only succeeds if object version hasn't changed
        op = ioctx.create_write_op()
        op.assert_version(ver)
        op.write_full(b"6")
        op.set_xattr("locked", b"1")
        ioctx.operate_write_op(op, "counter")
        ioctx.release_write_op(op)
```

## Listing Objects in a Pool

Iterate over all objects:

```python
with cluster.open_ioctx("mypool") as ioctx:
    object_list = []
    for obj in ioctx.list_objects():
        object_list.append(obj.key)
    print(f"Found {len(object_list)} objects")
```

## Bulk Object Copy

Copy objects between pools using read-then-write:

```python
def copy_object(src_ioctx, dst_ioctx, key):
    size, _ = src_ioctx.stat(key)
    data = src_ioctx.read(key, length=size)
    dst_ioctx.write_full(key, data)
    # Copy xattrs
    for name, val in src_ioctx.get_xattrs(key):
        dst_ioctx.set_xattr(key, name, val)
```

## Using C for Offset Writes

```c
/* Write "HELLO" starting at byte offset 10 */
ret = rados_write(io, "myobj", "HELLO", 5, 10);

/* Read 5 bytes starting at offset 10 */
ret = rados_read(io, "myobj", buf, 5, 10);
```

## Summary

librados provides rich direct object access beyond basic put/get, including partial reads and writes by offset, atomic compare-and-swap via `WriteOp` with `assert_version`, object stat queries, append operations, and truncation. These primitives enable building efficient custom storage protocols on top of RADOS without the overhead of higher-level interfaces.
