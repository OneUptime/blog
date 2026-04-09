# How to Use librados with C++

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, librados, C++, RADOS

Description: Learn how to use the librados C++ API to connect to Ceph and perform object storage operations using the object-oriented Rados and IoCtx classes.

---

The librados C++ API wraps the C API in an object-oriented interface, providing RAII-style resource management, exception handling, and a cleaner syntax for building Ceph-integrated applications in modern C++.

## Installation

```bash
# Ubuntu/Debian
sudo apt install librados-dev libradospp-dev

# RHEL/CentOS
sudo dnf install librados-devel libradospp-devel
```

## Complete Write and Read Example

```cpp
#include <rados/librados.hpp>
#include <iostream>
#include <string>
#include <sstream>

int main() {
    librados::Rados cluster;
    librados::IoCtx io;

    // Initialize cluster handle for the "admin" user
    int ret = cluster.init("admin");
    if (ret < 0) {
        std::cerr << "Failed to init: " << ret << std::endl;
        return 1;
    }

    // Read Ceph configuration
    ret = cluster.conf_read_file("/etc/ceph/ceph.conf");
    if (ret < 0) {
        std::cerr << "Failed to read config: " << ret << std::endl;
        cluster.shutdown();
        return 1;
    }

    // Connect to the cluster
    ret = cluster.connect();
    if (ret < 0) {
        std::cerr << "Failed to connect: " << ret << std::endl;
        cluster.shutdown();
        return 1;
    }

    // Open pool I/O context
    ret = cluster.ioctx_create("mypool", io);
    if (ret < 0) {
        std::cerr << "Failed to open pool: " << ret << std::endl;
        cluster.shutdown();
        return 1;
    }

    // Write an object using a bufferlist
    librados::bufferlist bl;
    bl.append("Hello from librados C++!");

    ret = io.write_full("myobj", bl);
    if (ret == 0) {
        std::cout << "Write successful" << std::endl;
    }

    // Read the object back
    librados::bufferlist read_bl;
    ret = io.read("myobj", read_bl, 256, 0);
    if (ret > 0) {
        std::cout << "Read: " << read_bl.to_str() << std::endl;
    }

    // Cleanup (automatic via destructors, but explicit here for clarity)
    io.close();
    cluster.shutdown();
    return 0;
}
```

## Compiling

```bash
g++ -std=c++17 -o rados_cpp rados_cpp.cc -lrados
./rados_cpp
```

## Working with bufferlist

The `bufferlist` type is the central data container in the C++ API:

```cpp
librados::bufferlist bl;

// Append data
bl.append("chunk1");
bl.append(std::string(1024, '\0'));  // 1KB of zeros

// Convert to string
std::string content = bl.to_str();

// Get raw pointer and length
const char* ptr = bl.c_str();
size_t len = bl.length();
```

## Object Operations

```cpp
// Check if object exists (stat)
uint64_t size;
time_t mtime;
ret = io.stat("myobj", &size, &mtime);
if (ret == 0) {
    std::cout << "Size: " << size << " bytes" << std::endl;
}

// Append to existing object
librados::bufferlist append_bl;
append_bl.append(" - appended data");
io.append("myobj", append_bl, append_bl.length());

// Remove object
io.remove("myobj");
```

## Using ObjectWriteOperation for Atomic Ops

```cpp
librados::ObjectWriteOperation op;
librados::bufferlist new_bl;
new_bl.append("atomic write");

op.write_full(new_bl);

librados::bufferlist xattr_bl;
xattr_bl.append("rados-cpp");
op.setxattr("written-by", xattr_bl);

ret = io.operate("myobj", &op);
```

## Summary

The librados C++ API centers on the `Rados` cluster handle and `IoCtx` pool context objects, using `bufferlist` as the universal data container. The object-oriented design simplifies resource management versus the C API, and `ObjectWriteOperation` enables atomic multi-step write operations. Compile with `-lrados` and link against `librados.hpp` for the full C++ interface.
