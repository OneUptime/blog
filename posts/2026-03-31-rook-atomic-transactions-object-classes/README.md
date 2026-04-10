# How to Implement Atomic Transactions with Object Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Object Class, Atomic, Transaction, RADOS, Consistency

Description: Use Ceph object class methods to implement atomic read-modify-write transactions on RADOS objects, preventing race conditions in concurrent storage operations.

---

RADOS does not provide multi-object transactions, but object classes enable atomic operations on a single object. A method runs entirely within the OSD lock for that object, making any read-modify-write within the method atomic from the perspective of other clients.

## Why Atomicity Matters

Without object classes, a counter increment requires three separate RADOS operations:
1. Read the current value
2. Increment in client memory
3. Write the new value

Between steps 1 and 3, another client may increment the same value, causing a lost update. An object class method runs atomically on the OSD - no other client can modify the object between the read and write.

## Atomic Counter Implementation

```cpp
// cls_counter.cc
#include "objclass/objclass.h"
#include <string>

CLS_VER(1, 0)
CLS_NAME(counter)

// Atomically increment a named counter stored in object xattrs
static int increment(cls_method_context_t hctx,
                     ceph::buffer::list *in,
                     ceph::buffer::list *out) {
    std::string counter_name;
    int64_t delta = 1;

    try {
        auto iter = in->cbegin();
        ceph::decode(counter_name, iter);
        if (!iter.end()) {
            ceph::decode(delta, iter);
        }
    } catch (ceph::buffer::error &e) {
        return -EINVAL;
    }

    // Read current value from xattr
    ceph::buffer::list xattr_bl;
    int64_t current = 0;
    int r = cls_cxx_getxattr(hctx, counter_name.c_str(), &xattr_bl);
    if (r == 0 && xattr_bl.length() > 0) {
        auto iter = xattr_bl.cbegin();
        ceph::decode(current, iter);
    } else if (r != -ENODATA && r != -ENOENT) {
        return r;
    }

    // Increment and store back
    current += delta;
    ceph::buffer::list new_val;
    ceph::encode(current, new_val);
    r = cls_cxx_setxattr(hctx, counter_name.c_str(), &new_val);
    if (r < 0) return r;

    // Return the new value
    ceph::encode(current, *out);
    return 0;
}

// Atomic compare-and-swap on an xattr
static int cas_xattr(cls_method_context_t hctx,
                     ceph::buffer::list *in,
                     ceph::buffer::list *out) {
    std::string attr_name;
    int64_t expected_val, new_val;

    try {
        auto iter = in->cbegin();
        ceph::decode(attr_name, iter);
        ceph::decode(expected_val, iter);
        ceph::decode(new_val, iter);
    } catch (ceph::buffer::error &e) {
        return -EINVAL;
    }

    // Read current
    ceph::buffer::list current_bl;
    int64_t current = 0;
    int r = cls_cxx_getxattr(hctx, attr_name.c_str(), &current_bl);
    if (r == 0) {
        auto iter = current_bl.cbegin();
        ceph::decode(current, iter);
    }

    // Compare
    if (current != expected_val) {
        ceph::encode(current, *out);  // Return current value on failure
        return -ECANCELED;            // Signal CAS failed
    }

    // Swap
    ceph::buffer::list new_bl;
    ceph::encode(new_val, new_bl);
    r = cls_cxx_setxattr(hctx, attr_name.c_str(), &new_bl);
    if (r < 0) return r;

    ceph::encode(new_val, *out);
    return 0;
}

void __cls_init() {
    cls_handle_t h_class;
    cls_register("counter", &h_class);

    cls_method_handle_t h_incr, h_cas;
    cls_register_cxx_method(h_class, "increment",
                             CLS_METHOD_RD | CLS_METHOD_WR,
                             increment, &h_incr);
    cls_register_cxx_method(h_class, "cas_xattr",
                             CLS_METHOD_RD | CLS_METHOD_WR,
                             cas_xattr, &h_cas);
}
```

## Calling the Atomic Counter from Python

```python
import rados
import struct

def encode_args(*args):
    """Encode multiple values in Ceph's little-endian format"""
    result = b""
    for arg in args:
        if isinstance(arg, str):
            encoded = arg.encode("utf-8")
            result += struct.pack("<I", len(encoded)) + encoded
        elif isinstance(arg, int):
            result += struct.pack("<q", arg)  # int64_t
    return result

cluster = rados.Rados(conffile="/etc/ceph/ceph.conf")
cluster.connect()
ioctx = cluster.open_ioctx("mypool")

# Create the object if it doesn't exist
ioctx.write_full("counters", b"")

# Atomically increment "page_views" counter by 1
ret, result = ioctx.execute("counters", "counter", "increment",
                             encode_args("page_views"))
new_count = struct.unpack("<q", result)[0]
print(f"New page_views count: {new_count}")

# Atomically increment by 5
ret, result = ioctx.execute("counters", "counter", "increment",
                             encode_args("page_views", 5))
new_count = struct.unpack("<q", result)[0]
print(f"After +5: {new_count}")

# Compare-and-swap: set to 100 only if current == new_count
try:
    ret, result = ioctx.execute("counters", "counter", "cas_xattr",
                                 encode_args("page_views", new_count, 100))
    print(f"CAS succeeded, new value: {struct.unpack('<q', result)[0]}")
except rados.Error as e:
    print(f"CAS failed: {e}")

ioctx.close()
cluster.shutdown()
```

## Summary

Ceph object classes enable atomic transactions on single RADOS objects by running read-modify-write logic within the OSD's object lock. This prevents race conditions in concurrent scenarios like counters, state machines, and metadata updates. The counter and compare-and-swap patterns demonstrated here are the foundation for implementing more complex atomic workflows - such as distributed locks, job queues, and idempotent processing records - using RADOS as the coordination backend.
