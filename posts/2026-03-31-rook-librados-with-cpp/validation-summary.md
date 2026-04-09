# Validation Summary: How to Use librados with C++

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- librados (RADOS object store C++ client library)
- Rook (Ceph operator for Kubernetes)
- C++17
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Ceph source code on GitHub: `src/include/rados/librados.hpp` (class definitions for `Rados`, `IoCtx`, method signatures)
- Ceph source code on GitHub: `src/include/buffer.h` and `src/include/buffer_fwd.h` (bufferlist class and namespace aliases)
- Ceph source code on GitHub: `src/librados/IoCtxImpl.cc` (implementation of `append`, `read`, `write_full`, `operate`)
- Ceph Debian packaging: `debian/control` (package names `libradospp-dev` vs `librados-dev`)
- Ceph RPM packaging: `ceph.spec.in` (package names `libradospp-devel` vs `librados-devel`)

## Issues Found

### 1. Incomplete package names for C++ development (Installation section)
**What was wrong:** The post listed `librados-dev` (Debian) and `librados-devel` (RHEL) as the required packages. These only provide the C headers. The C++ header `librados.hpp` is shipped in separate packages: `libradospp-dev` (Debian) and `libradospp-devel` (RHEL).
**What was changed:** Added `libradospp-dev` and `libradospp-devel` to the respective install commands.

### 2. Missing required `len` argument in `io.append()` call (Object Operations section)
**What was wrong:** The call `io.append("myobj", append_bl)` was missing the third argument. The actual signature is `int append(const std::string& oid, bufferlist& bl, size_t len)` — all three arguments are required. The code would not compile as written.
**What was changed:** Fixed to `io.append("myobj", append_bl, append_bl.length())`.

### 3. Non-compiling `setxattr` example (ObjectWriteOperation section)
**What was wrong:** The expression `librados::bufferlist().append_zero(0)` was used inline as the second argument to `op.setxattr()`. This does not compile because `append_zero()` returns `void`, not a `bufferlist&`, so it cannot be used as a chained expression. Additionally, `append_zero(0)` appends zero bytes, which is a no-op and not a meaningful xattr value.
**What was changed:** Replaced with a named `xattr_bl` bufferlist containing a meaningful string value, passed as a separate variable to `setxattr()`.

## Review Notes
- The `bufferlist` type is technically `ceph::buffer::list`, aliased into the `librados` namespace via `using ceph::bufferlist;` in `librados.hpp`. The blog's usage of `librados::bufferlist` is correct and idiomatic.
- The `c_str()` method on bufferlist forces the buffer to become contiguous (may trigger a rebuild/copy). This is not mentioned in the post but is worth noting for performance-sensitive use cases.
- The post's return value checks are correct: `write_full` returns 0 on success, `read` returns bytes read (positive) on success.
- The `init("admin")` call correctly takes just the user ID portion, not the full `client.admin` entity name.
