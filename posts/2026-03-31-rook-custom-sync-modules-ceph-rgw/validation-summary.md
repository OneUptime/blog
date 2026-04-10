# Validation Summary: How to Write Custom Sync Modules for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (v18.2.0 / Reef)
- Ceph RGW (RADOS Gateway)
- RGW Sync Module C++ Framework
- CMake build system
- radosgw-admin CLI
- Rook (Kubernetes operator for Ceph)

## Sources Consulted
- Ceph v18.2.0 source: `src/rgw/driver/rados/rgw_sync_module.h` (actual class definitions for RGWSyncModule, RGWSyncModuleInstance, RGWDataSyncModule) — https://github.com/ceph/ceph/blob/v18.2.0/src/rgw/driver/rados/rgw_sync_module.h
- Ceph v18.2.0 source: `src/rgw/driver/rados/rgw_sync_module.cc` (module registration via `rgw_register_sync_modules()`) — https://github.com/ceph/ceph/blob/v18.2.0/src/rgw/driver/rados/rgw_sync_module.cc
- Ceph v18.2.0 source: `src/rgw/driver/rados/rgw_sync_module_es.h` and `rgw_sync_module_es.cc` (Elasticsearch sync module as reference implementation)
- Ceph v18.2.0 source: `src/rgw/CMakeLists.txt` (build target `rgw_common` and `librgw_common_srcs` list)
- Ceph v18.2.0 source: `src/rgw/rgw_cr_rest.h` (REST coroutine classes including `RGWPostRESTResourceCR`)

## Issues Found

1. **Incorrect comment labeling `RGWSyncModuleInstance` as "the factory"**: The blog comment said `RGWSyncModuleInstance` is "The module factory - registered at startup." In reality, `RGWSyncModule` is the factory (it has `create_instance()`), and `RGWSyncModuleInstance` is the instantiated module produced by the factory. Fixed the comment to say "The instantiated module - created by the factory."

2. **Missing `create_delete_marker()` pure virtual method**: `RGWDataSyncModule` has three pure virtual methods: `sync_object()`, `remove_object()`, and `create_delete_marker()`. The blog only listed the first two, which would result in code that does not compile. Added `create_delete_marker()` to the interface listing and added a comment in the implementation reminding readers to override all three methods.

3. **Invalid CMake flag `-DWITH_PYTHON3=ON`**: The `WITH_PYTHON3` CMake variable takes a version string (e.g., `"3"` or `"3.9"`), not a boolean. Passing `ON` would be interpreted as the literal string "ON" by `find_package(Python3)` and could cause build configuration failures. Removed this flag since the default behavior is correct.

4. **Wrong file paths for v18.2.0**: The blog placed custom module files at `src/rgw/rgw_sync_module_custom.*`. In Ceph v18.2.0 (Reef), the RGW sync module source files live under `src/rgw/driver/rados/`. Fixed all paths to `src/rgw/driver/rados/rgw_sync_module_custom.*`.

5. **Wrong registration file name and method**: The blog said to add code to `rgw_sync_modules.cc` (plural) in `RGWSyncModulesManager::create_module()`. The correct file is `rgw_sync_module.cc` (singular) under `driver/rados/`, and the correct approach is to add a call to `modules_manager->register_module()` inside the `rgw_register_sync_modules()` function. Fixed the file name, function name, and registration code pattern.

6. **Wrong CMake target name**: The blog said to add the source file to the `rgw_op` library. The correct target is `rgw_common`, built from the `librgw_common_srcs` variable. Fixed the CMake comment.

7. **Non-existent coroutine class `RGWPostHTTPDataCR`**: This class does not exist in the Ceph codebase. The correct coroutine for REST POST operations is `RGWPostRESTResourceCR` (defined in `rgw_cr_rest.h`). Replaced with the correct class name and adjusted constructor arguments to match the actual API.

## Review Notes
- The blog targets Ceph v18.2.0 (Reef). The file path structure changed significantly in the Reef release (files moved from `src/rgw/` to `src/rgw/driver/rados/`). Users working with older Ceph versions (e.g., Quincy/v17.x) may find files at the old paths.
- The code examples use C++ variadic arguments (`...`) to elide additional parameters in the method signatures. This is acceptable for a tutorial but readers should consult the actual header for the full signatures when implementing.
- The `RGWPostRESTResourceCR` class used in the corrected example is a template class; in a real implementation, the template parameters and constructor arguments would need to match the specific data types being sent.
- The blog mixes standalone Ceph commands with Rook/Kubernetes commands (kubectl in Step 6) without clarifying when each applies. This isn't technically wrong but could confuse readers about the deployment context.
