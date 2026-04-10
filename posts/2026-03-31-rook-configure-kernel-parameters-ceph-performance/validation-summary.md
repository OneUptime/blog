# Validation Summary: How to Configure Kernel Parameters for Ceph Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (BlueStore, OSD)
- Rook
- Linux kernel (sysctl, udev, I/O schedulers)
- NVMe and HDD storage
- TCP/IP network tuning
- Transparent Huge Pages (THP)
- RocksDB

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/start/hardware-recommendations/
- Red Hat Ceph Storage 7 Performance Tuning Guide
- RocksDB tuning wiki: https://github.com/facebook/rocksdb/wiki/Setup-Options-and-Basic-Tuning
- Linux kernel sysctl documentation: https://www.kernel.org/doc/Documentation/sysctl/
- Linux kernel block layer documentation (I/O schedulers, nr_requests)
- POSIX shell specification (heredoc redirection in pipelines)

## Issues Found

### 1. Heredoc placement in shell pipelines (3 occurrences)
**What was wrong:** The commands used the pattern `cat | sudo tee file << 'EOF'`, where the heredoc redirect is syntactically attached to `tee` (the last command in the pipeline), overriding its pipe stdin. This causes `cat` to read from terminal stdin and hang, making the command non-functional in interactive use.

**What was changed:** Moved the heredoc to apply to `cat` instead: `cat << 'EOF' | sudo tee file`. This correctly feeds the heredoc content through `cat` into the pipe to `tee`.

**Affected locations:** Network parameters section, Memory parameters section, and udev rules section.

### 2. Transparent Huge Pages recommendation was incorrect
**What was wrong:** The post claimed "BlueStore uses RocksDB, which benefits from transparent huge pages" and recommended setting THP to `always` with defrag set to `defer+madvise`. This is the opposite of official Ceph guidance. THP causes latency spikes on OSD nodes due to background memory compaction by `khugepaged`.

**What was changed:** Replaced the section to recommend disabling THP (`echo never`) for both `enabled` and `defrag`, with an explanation of why THP is harmful for Ceph workloads. Updated the section heading from "Huge Pages for RocksDB (BlueStore)" to "Transparent Huge Pages" to avoid implying THP benefits RocksDB.

## Review Notes
- The `cat << 'EOF' | sudo tee file` pattern still involves a "useless use of cat" — `sudo tee file << 'EOF'` would be simpler — but the `cat` form is a widely used idiom and works correctly.
- The `nr_requests` tuning for NVMe (1024) is reasonable but its effect is limited when using the `none` I/O scheduler, since there is no actual request reordering. It primarily controls software queue depth for burst absorption.
- The network parameter values (128MB buffers) are aggressive and appropriate for dedicated Ceph networks but may be excessive for shared networks. The post could note this caveat in a future update.
- The `vm.dirty_ratio = 5` and `vm.dirty_background_ratio = 2` values are lower than defaults and appropriate for storage-intensive workloads, as recommended by Ceph tuning guides.
- None of the sysctl parameter names or values are deprecated in current kernels.
