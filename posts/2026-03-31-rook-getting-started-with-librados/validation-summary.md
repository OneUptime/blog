# Validation Summary: How to Get Started with librados (Introduction)

## Status
validated

## Post Type
Guide / Introduction

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- librados (C, C++, Python bindings)
- Rook (mentioned in tags)
- `rados` CLI tool

## Sources Consulted
- Ceph official documentation: librados API reference (https://docs.ceph.com/en/latest/rados/api/librados/)
- Ceph official documentation: librados introduction (https://docs.ceph.com/en/latest/rados/api/librados-intro/)
- Ceph source code: `librados.hpp` vs `libradosstriper.hpp` header locations
- Ceph official documentation: RADOS architecture (https://docs.ceph.com/en/latest/architecture/#rados)
- `rados` CLI man page (https://docs.ceph.com/en/latest/man/8/rados/)

## Issues Found
1. **Incorrect C++ header file**: The C++ binding was listed as `libradosstriper.hpp`, but `libradosstriper` is a separate striping library built on top of librados — not the core C++ binding. The correct header for the librados C++ wrapper is `librados/librados.hpp`. Fixed on line 39.

## Review Notes
- The monitor port `6789` shown in the example config is the legacy v1 messenger port. Since Ceph Nautilus (14.x), the default messenger protocol is msgr2 on port `3300`, though `6789` remains supported for backward compatibility. This is not wrong but worth noting for readers running modern Ceph clusters.
- The "atomic transactions" bullet mentions "compare-and-swap" which is a slight simplification. librados supports compound atomic operations via `ObjectWriteOperation`/`ObjectReadOperation` (including `cmpext` for compare-extent), but does not expose a literal CAS primitive. The description is close enough for an introductory post.
- The post is an introduction/overview and does not include actual code examples using the librados API — a follow-up post with working code samples would strengthen the series.
