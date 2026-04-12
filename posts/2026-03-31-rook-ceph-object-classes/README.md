# How to Understand Ceph Object Classes and Custom Methods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ObjectClass, RADOS, Storage, Extension

Description: Learn how Ceph object classes let you run custom C++ or Lua code directly on OSDs, enabling server-side computation that reduces network round trips.

---

## What Are Ceph Object Classes

Ceph object classes are a server-side extensibility mechanism that allows you to load custom code into OSD processes. Object classes define methods that execute directly on the OSD that holds a given object, performing computation where the data lives.

This eliminates the need to transfer data to a client for processing and send results back - a major performance advantage for operations like counting, filtering, or aggregating large objects.

## Built-in Object Classes

Ceph ships with several built-in object classes used internally:

- `lock`: Distributed locking for RBD images
- `rbd`: RBD image header and metadata operations
- `rgw`: RGW bucket index operations
- `cephfs`: CephFS directory and inode operations
- `otp`: One-time password support

List available classes:

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# Show information about a RADOS class shared object
ceph-clsinfo /usr/lib/rados-classes/libcls_rbd.so
```

## How Object Class Methods Work

An object class defines one or more methods. Each method receives the target object (identified by pool and object name) and a parameter buffer. The method can:

- Read or write the object data
- Read or write xattrs
- Read or write omap keys
- Create or delete objects
- Iterate over object collections

The client calls a class method via a RADOS operation:

```python
import rados

cluster = rados.Rados(conffile='/etc/ceph/ceph.conf')
cluster.connect()
ioctx = cluster.open_ioctx('mypool')

# Call a class method
ioctx.execute('my-object', 'myclass', 'mymethod', b'input-data')
```

## Writing a Custom Object Class (C++)

A minimal object class:

```cpp
#include "objclass/objclass.h"

CLS_VER(1, 0)
CLS_NAME(myclass)

static int count_words(cls_method_context_t hctx,
                        bufferlist *in, bufferlist *out) {
    bufferlist data;
    int r = cls_cxx_read(hctx, 0, 0, &data);
    if (r < 0) return r;

    std::string content(data.c_str(), data.length());
    size_t words = std::count(content.begin(), content.end(), ' ') + 1;

    ::encode(words, *out);
    return 0;
}

CLS_INIT(myclass) {
    cls_handle_t h_class;
    cls_method_handle_t h_count_words;

    cls_register("myclass", &h_class);
    cls_register_cxx_method(h_class, "count_words",
                            CLS_METHOD_RD, count_words, &h_count_words);
}
```

Build and install the `.so` file to the `$libdir/rados-classes/` directory (typically `/usr/lib/rados-classes/` or `/usr/lib64/rados-classes/` depending on the platform) on each OSD node.

## Lua Object Classes

Newer Ceph versions support Lua-based object classes for lighter-weight scripting:

```lua
function count_words(input, output)
    local data = objclass.read(0, 0)
    local count = 0
    for _ in data:gmatch("%S+") do count = count + 1 end
    output:append(tostring(count))
end
objclass.register(count_words)
```

## Use Cases

- **Index maintenance**: RGW uses object classes to maintain bucket indexes atomically within a single RADOS operation
- **Aggregation**: Sum or average fields across omap entries without client-side iteration
- **Conditional writes**: Test-and-set operations that atomically check a condition and write
- **Bloom filters**: Server-side existence checks for deduplication pipelines

## Summary

Ceph object classes provide a powerful server-side execution model that moves computation to the OSD layer, minimizing data movement across the network. Built-in classes power critical Ceph services like RBD, RGW, and CephFS. Custom object classes extend this model for application-specific needs such as server-side aggregation, conditional writes, and index maintenance. Understanding object classes helps you leverage Ceph as a compute substrate, not just a storage system.
