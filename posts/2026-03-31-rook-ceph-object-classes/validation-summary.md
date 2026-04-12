# Validation Summary: How to Understand Ceph Object Classes and Custom Methods

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Ceph (RADOS object classes)
- Rook (Ceph operator for Kubernetes)
- Python rados bindings
- C++ object class API (objclass.h)
- Lua scripting via cls_lua module

## Sources Consulted
- Ceph source code on GitHub (`ceph/ceph` main branch):
  - `src/cls/rgw/cls_rgw.cc` — registered class name verification
  - `src/cls/cephfs/cls_cephfs.cc` — registered class name verification
  - `src/cls/otp/cls_otp.cc` — registered class name verification
  - `src/cls/lua/cls_lua.cc` — Lua object class API verification
  - `src/include/rados/objclass.h` — C++ class API macros and function signatures
  - `src/pybind/rados/rados.pyx` — Python `Ioctx.execute()` method signature
  - `src/osd/OSD.cc` — admin socket command registration (to verify `list_obj_classes`)
- Ceph man pages: `man/8/ceph-clsinfo`

## Issues Found

1. **Built-in class names used wrong convention**: The post listed `cls_rgw`, `cls_cephfs`, and `cls_otp` as class names. The `cls_` prefix is a filename/directory convention, not the registered class name. The actual registered names (via `cls_register()` and `CLS_NAME()` macros) are `rgw`, `cephfs`, and `otp`. Fixed all three to use the correct registered names.

2. **Non-existent admin socket command**: The post claimed you could run `ceph daemon osd.0 list_obj_classes` to list loaded object classes. This command does not exist in the OSD admin socket. Replaced with `ceph-clsinfo`, which is the actual Ceph tool for inspecting RADOS class shared object files.

3. **Lua handler function signature**: The Lua example defined `function count_words(input)` with a single parameter. The actual `cls_lua` handler signature requires two parameters: `function count_words(input, output)` where `output` is a bufferlist-like object for the response. Fixed to include both parameters.

4. **Non-existent `objclass.reply()` function**: The Lua example used `objclass.reply(tostring(count))` which does not exist in the `cls_lua` API. The correct way to return data is via the `output` parameter: `output:append(tostring(count))`. Fixed accordingly.

5. **Wrong `objclass.register()` arity**: The post used `objclass.register("count_words", count_words)` with two arguments. The actual function takes a single argument (the function itself), and the function's Lua name becomes the handler name: `objclass.register(count_words)`. Fixed to use single-argument form.

6. **Install path too specific**: The post stated the install path is `/usr/lib/rados-classes/`. The actual default is `$libdir/rados-classes/`, which resolves to `/usr/lib/rados-classes/` on some systems but `/usr/lib64/rados-classes/` on 64-bit RHEL/CentOS. Updated to mention both the variable and common concrete paths.

## Review Notes
- The C++ example's word counting logic (counting spaces + 1) is simplistic and would miscount for empty strings, multiple consecutive spaces, or leading/trailing whitespace. However, the example is clearly labeled as "minimal" and the word counting is incidental to demonstrating the object class mechanism, so this is acceptable.
- The C++ example does not include `<algorithm>` for `std::count`, relying on transitive inclusion from `objclass.h`. This is common in illustrative examples and acceptable.
- The Lua object class feature (`cls_lua`) has been somewhat experimental across Ceph releases and may not be available or stable in all versions. The post's qualifier "Newer Ceph versions support Lua-based object classes" is appropriately vague.
- The Python rados `execute()` method call is correct and matches the current API signature.
