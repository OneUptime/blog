# How to Debug Object Class Execution in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Object Class, Debugging, OSD, Logging, Troubleshooting

Description: Debug Ceph object class methods using OSD log levels, CLS_LOG macros, and test utilities to identify errors in server-side object processing logic.

---

Debugging Ceph object classes is more complex than debugging regular application code because the class runs inside an OSD process on a remote node. This guide covers the tools and techniques for diagnosing issues in object class execution.

## OSD Debug Logging for Object Classes

Object classes log via the Ceph logging framework. To see class log output, increase the log level for the relevant OSD:

```bash
# Increase log level for a specific OSD at runtime (no restart needed)
ceph tell osd.0 config set debug_osd 20
ceph tell osd.0 config set debug_objclass 20

# Or increase on all OSDs
ceph tell 'osd.*' config set debug_osd 10
ceph tell 'osd.*' config set debug_objclass 20

# Watch the OSD log
tail -f /var/log/ceph/ceph-osd.0.log | grep -i "myclass\|error\|class"
```

## Adding CLS_LOG Statements to Your Class

Use `CLS_LOG` in your class code to emit structured log messages:

```cpp
#include "objclass/objclass.h"

static int my_method(cls_method_context_t hctx,
                     ceph::buffer::list *in,
                     ceph::buffer::list *out) {
    CLS_LOG(10, "my_method called, input size=%u", in->length());

    std::string arg;
    try {
        auto iter = in->cbegin();
        ceph::decode(arg, iter);
        CLS_LOG(20, "decoded arg: %s", arg.c_str());
    } catch (ceph::buffer::error &e) {
        CLS_ERR("Failed to decode input: %s", e.what());
        return -EINVAL;
    }

    // Process...
    ceph::buffer::list data;
    int r = cls_cxx_read(hctx, 0, 0, &data);
    if (r < 0) {
        CLS_ERR("Failed to read object: %d", r);
        return r;
    }

    CLS_LOG(20, "Object data length: %u", data.length());

    // ... rest of logic ...
    return 0;
}
```

CLS_LOG levels: 0=always, 1-9=info, 10-19=debug, 20+=trace

## Testing Object Classes with ceph-cls-test

Ceph provides a test harness for unit testing object classes without a running cluster:

```bash
# Build tests alongside the class (Ceph development environment)
# In a Ceph source checkout:
ninja ceph_test_cls_myclass -C build/

# Or write a standalone test using the test framework
```

## Calling the Class and Capturing Errors

From the client side, examine error codes from `exec`:

```python
import rados

cluster = rados.Rados(conffile="/etc/ceph/ceph.conf")
cluster.connect()
ioctx = cluster.open_ioctx("mypool")

try:
    ret, output = ioctx.execute("test-obj", "myclass", "my_method", b"bad input")
    print(f"Success: ret={ret}, output={output}")
except rados.Error as e:
    print(f"Error code: {e.errno}")
    print(f"Error message: {str(e)}")
    # errno maps to Linux error codes:
    # -EINVAL (22) = bad input arguments
    # -ENOENT (2)  = object not found
    # -EIO (5)     = I/O error during execution
    # -EACCES (13) = permission denied
```

## Checking OSD for Class Load Errors

```bash
# Check if the class loaded successfully at OSD startup
journalctl -u ceph-osd@0 | grep -E "class|plugin|load|error" | head -20

# Check for missing symbols or library issues
journalctl -u ceph-osd@0 | grep -i "dlopen\|undefined symbol\|cannot open"

# Verify the class file is present and has correct permissions
ls -la /usr/lib/rados-classes/cls_myclass.so
file /usr/lib/rados-classes/cls_myclass.so
ldd /usr/lib/rados-classes/cls_myclass.so
```

## Ad-Hoc Testing with a Python Script

The `rados` CLI does not have a subcommand for invoking object class methods. Use a Python script with librados instead:

```python
import rados

cluster = rados.Rados(conffile="/etc/ceph/ceph.conf")
cluster.connect()
ioctx = cluster.open_ioctx("mypool")

# Create a test object
ioctx.write_full("debug-obj", b"test content for debugging")

# Call the class method with no input
ret, output = ioctx.execute("debug-obj", "myclass", "count_words", b"")
print(f"count_words returned: ret={ret}, output={output}")

# Call with encoded input
import struct
s = b"test arg"
data = struct.pack("<I", len(s)) + s
ret, output = ioctx.execute("debug-obj", "myclass", "my_method", data)
print(f"my_method returned: ret={ret}, output={output}")

ioctx.close()
cluster.shutdown()
```

## Common Errors and Fixes

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| -EINVAL (22) | Input buffer decode failed | Check argument encoding matches C++ decode |
| -ENOENT (2) | Object does not exist before exec | Create the object before calling exec |
| -95 (EOPNOTSUPP) | Class or method not found | Verify .so is on all OSD nodes, check method name |
| OSD crashes | Null pointer, buffer overflow | Add bounds checks, use valgrind in test env |

## Summary

Debugging Ceph object classes requires combining CLS_LOG statements in the class code with elevated OSD log levels to see execution traces. Client-side, check error codes from `exec` calls and map them to errno values. For systematic testing, use Python scripts with `ioctx.execute()` for ad-hoc invocation and verify library loading via `journalctl` on the OSD nodes. Always test with known-good inputs and known-bad inputs to verify both success and error paths before deploying to production.
