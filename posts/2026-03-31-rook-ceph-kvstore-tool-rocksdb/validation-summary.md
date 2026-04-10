# Validation Summary: How to Use ceph-kvstore-tool for RocksDB Operations

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (BlueStore OSDs, Monitor stores)
- RocksDB (key-value store backend)
- ceph-kvstore-tool (CLI utility)
- Rook-Ceph (Kubernetes operator for Ceph)
- monmaptool

## Sources Consulted
- Official Ceph man page for ceph-kvstore-tool: https://docs.ceph.com/en/latest/man/8/ceph-kvstore-tool/
- Ceph source code (ceph_kvstore_tool.cc) on GitHub main branch: https://github.com/ceph/ceph/blob/main/src/tools/ceph_kvstore_tool.cc
- Ceph man page RST source: https://github.com/ceph/ceph/blob/main/doc/man/8/ceph-kvstore-tool.rst
- Debian man page (testing): https://manpages.debian.org/testing/ceph-base/ceph-kvstore-tool.8.en.html
- Ubuntu man page (Jammy): https://manpages.ubuntu.com/manpages/jammy/man8/ceph-kvstore-tool.8.html

## Issues Found

### 1. Invalid `--osd-data` flag in BlueStore KV access command
- **What was wrong:** The command used `--osd-data /var/lib/ceph/osd/ceph-0` as a named flag. `--osd-data` is not a valid option for `ceph-kvstore-tool`. The tool uses positional arguments: `<store-type> <store-path> <command>`.
- **What was changed:** Removed the `--osd-data` flag and made the path a positional argument: `ceph-kvstore-tool bluestore-kv /var/lib/ceph/osd/ceph-0 list`.
- **Why:** The tool's synopsis is `ceph-kvstore-tool <rocksdb|bluestore-kv> <store path> command [args...]` with all positional arguments. The `--osd-data` flag does not exist in the source code or documentation.

### 2. Incorrect `get` output redirection for binary data
- **What was wrong:** The command used shell redirection (`> /tmp/monmap-version1.bin`) to capture the output of `get monmap 1`. However, `get` outputs a hex dump to stdout by default, not raw binary data.
- **What was changed:** Replaced `> /tmp/monmap-version1.bin` with `out /tmp/monmap-version1.bin`, which uses the tool's built-in `out` parameter to write raw binary data to the file.
- **Why:** The `get` subcommand syntax is `get <prefix> <key> [out <file>]`. Without the `out` parameter, only a hex dump is printed. The `out` parameter writes the actual binary value, which is required for `monmaptool --print` to decode it correctly.

### 3. Outdated `repair` subcommand name
- **What was wrong:** The command used `repair` as the subcommand name. This was the command name in Ceph Luminous (v12.x) but was renamed in Nautilus and all subsequent versions.
- **What was changed:** Replaced `repair` with `destructive-repair` and updated the comment to note the potentially destructive nature of the operation.
- **Why:** In all modern Ceph versions (Nautilus through Squid and main), the command is `destructive-repair`. The old `repair` name is not recognized and will fail. The rename was intentional to warn users that the operation can corrupt an otherwise uncorrupted database.

## Review Notes
- The `compact` command is correct and commonly needed for monitors with growing store sizes.
- The `dump` and `list` commands with prefix filtering are correctly documented.
- The `rm` command syntax is correct, and the warning about using it only as a last resort is appropriate.
- The backup step in the "Delete Specific Keys" section is shown after the delete command. In practice, users should back up before any destructive operation. The post's Summary section does mention this, but the code ordering could be confusing.
- The `kubectl scale deployment` approach to stopping an OSD is correct for Rook-Ceph deployments.
