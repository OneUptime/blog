# How to Write Custom Object Classes for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Object Class, RADOS, Storage API

Description: Learn how to write custom RADOS object classes that execute server-side code on Ceph OSDs to perform compute-near-data operations on stored objects.

---

RADOS object classes are server-side plugins that run directly on Ceph OSD processes. They enable compute-near-data patterns where logic executes alongside the stored data, reducing network traffic for operations like filtering, transformation, and aggregation.

## What Are Object Classes?

Object classes are shared libraries loaded by OSD daemons. When a client calls a class method:

1. The OSD loads the class library (if not cached)
2. The method executes with direct access to the object's data
3. Results are returned to the client

This avoids reading entire objects over the network when only a partial result is needed.

## Building a Custom Object Class

### C++ Class Source

```cpp
// myclass.cc
#include "objclass/objclass.h"

CLS_VER(1, 0)
CLS_NAME(myclass)

cls_handle_t h_class;
cls_method_handle_t h_echo;
cls_method_handle_t h_word_count;

// Echo method: returns the object content as-is
static int echo(cls_method_context_t hctx, ceph::buffer::list *in, ceph::buffer::list *out) {
    ceph::buffer::list obj_data;
    int ret = cls_cxx_read(hctx, 0, 0, &obj_data);
    if (ret < 0) return ret;
    *out = obj_data;
    return 0;
}

// Word count method: counts whitespace-separated tokens
static int word_count(cls_method_context_t hctx, ceph::buffer::list *in, ceph::buffer::list *out) {
    ceph::buffer::list obj_data;
    int ret = cls_cxx_read(hctx, 0, 0, &obj_data);
    if (ret < 0) return ret;

    std::string content = obj_data.to_str();
    int count = 0;
    bool in_word = false;
    for (char c : content) {
        if (std::isspace(c)) {
            in_word = false;
        } else if (!in_word) {
            in_word = true;
            count++;
        }
    }

    ceph::encode(count, *out);
    return 0;
}

void __cls_init() {
    CLS_LOG(1, "Loading myclass");
    cls_register("myclass", &h_class);
    cls_register_cxx_method(h_class, "echo", CLS_METHOD_RD, echo, &h_echo);
    cls_register_cxx_method(h_class, "word_count", CLS_METHOD_RD, word_count, &h_word_count);
}
```

### CMakeLists.txt

```cmake
add_library(cls_myclass SHARED myclass.cc)
target_link_libraries(cls_myclass cls)
install(TARGETS cls_myclass DESTINATION ${CMAKE_INSTALL_LIBDIR}/rados-classes)
```

## Deploying the Class

Copy the compiled shared library to all OSD nodes:

```bash
sudo cp libcls_myclass.so /usr/lib/rados-classes/
sudo systemctl restart ceph-osd@*
```

## Calling the Class from Python

```python
import rados

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        # Write test data
        ioctx.write_full("testobj", b"the quick brown fox jumps over the lazy dog")

        # Call the word_count class method
        ret, result = ioctx.execute("testobj", "myclass", "word_count", b"")
        import struct
        count = struct.unpack("<i", result)[0]
        print(f"Word count: {count}")  # 9
```

## Calling the Class from C

```c
rados_exec(io, "testobj", "myclass", "word_count", "", 0, buf, sizeof(buf));
```

## Summary

Custom RADOS object classes run server-side on OSD processes, enabling compute-near-data operations that avoid full object transfers over the network. Classes are C++ shared libraries that register methods via `cls_register_cxx_method`, are deployed by copying to `/usr/lib/rados-classes/` on OSD nodes, and are invoked from client code using `ioctx.execute()` (Python) or `rados_exec()` (C).
