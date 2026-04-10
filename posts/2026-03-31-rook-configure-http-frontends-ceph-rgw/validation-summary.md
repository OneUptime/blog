# Validation Summary: How to Configure HTTP Frontends for Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Beast HTTP frontend (Boost.Asio-based)
- Civetweb HTTP frontend (deprecated)
- Rook Ceph Operator
- CephObjectStore custom resource
- OpenSSL (certificate generation)
- Kubernetes TLS secrets

## Sources Consulted
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph HTTP Frontends Documentation: https://docs.ceph.com/en/latest/radosgw/frontends/
- Ceph source rgw.yaml.in (default values): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph frontends.rst (beast parameters): https://github.com/ceph/ceph/blob/main/doc/radosgw/frontends.rst
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephObjectStore documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Ceph PR #41367 (civetweb deprecation): https://github.com/ceph/ceph/pull/41367

## Issues Found

### 1. Incorrect keep-alive configuration (rgw_max_attr_size)
- **What was wrong:** The "Enabling HTTP/1.1 Keep-Alive" section used `rgw_max_attr_size` claiming it configured keep-alive timeout. `rgw_max_attr_size` controls the maximum size of object metadata (xattr) values and has nothing to do with HTTP keep-alive.
- **What was changed:** Replaced the section with correct information: beast supports HTTP/1.1 keep-alive by default, and `request_timeout_ms` (a beast frontend parameter, default 65000ms) is the relevant timeout for idle connections.
- **Why:** Using `rgw_max_attr_size` for keep-alive would have no effect on HTTP behavior and could cause unintended consequences for object metadata storage.

### 2. Incorrect description and default for rgw_max_chunk_size
- **What was wrong:** The comment said "Set max request size (default 128MB)" but `rgw_max_chunk_size` controls the chunk size for data operations and defaults to 4MB (4194304 bytes), not 128MB.
- **What was changed:** Corrected the comment to "Set max chunk size for data operations (default 4MB)".
- **Why:** The default value was wrong by a factor of 32x, and the description of what the parameter controls was inaccurate.

### 3. Invalid radosgw-admin command
- **What was wrong:** `radosgw-admin --id rgw.default daemon info` is not a valid command. `daemon info` is not a radosgw-admin subcommand.
- **What was changed:** Replaced with `ceph config get client.rgw.default rgw_frontends`, which is the correct way to verify frontend configuration and was already shown earlier in the post.
- **Why:** The original command would fail with an error.

### 4. Missing civetweb deprecation note
- **What was wrong:** civetweb was listed as an available frontend without noting it has been deprecated (in Pacific/v16) and removed (in Quincy/v17 and later).
- **What was changed:** Added "(deprecated in Pacific, removed in Quincy and later)" to the civetweb bullet point.
- **Why:** Readers using Quincy or newer Ceph versions would not have civetweb available.

## Review Notes
- The beast frontend configuration syntax and SSL options are correct.
- The Rook CephObjectStore YAML is accurate for current Rook versions, with correct field names for gateway port, securePort, sslCertificateRef, instances, and resources.
- The OpenSSL certificate generation command is correct.
- The kubectl TLS secret creation command is correct.
