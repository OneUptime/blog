# Validation Summary: How to Profile Ceph OSD Performance with perf

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux perf (performance counters for Linux)
- Ceph OSD (Object Storage Daemon)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph storage backend)
- RocksDB (embedded key-value store used by BlueStore)
- FlameGraph (Brendan Gregg's visualization tool)
- nsenter (Linux namespace utility)
- Kubernetes / kubectl

## Sources Consulted
- Linux perf man pages: `perf-record(1)`, `perf-report(1)`, `perf-trace(1)`, `perf-stat(1)`
- perf trace documentation — event filtering accepts syscall names, not strace-style categories
- Ceph admin socket command reference — `ceph daemon` subcommands for OSD
- RHEL/CentOS package naming for perf tools (`perf` package, not `linux-perf`)
- FlameGraph repository: https://github.com/brendangregg/FlameGraph

## Issues Found

1. **RHEL package name incorrect**: The install command `dnf install -y perf linux-perf` included `linux-perf`, which is a Debian/Ubuntu package name and does not exist on RHEL-based distributions. Changed to `dnf install -y perf`.

2. **Invalid `perf trace -e io` event category**: `perf trace` does not support strace-style event categories like `io`. The `-e` flag requires explicit syscall names. Changed to `perf trace -e read,write,pread64,pwrite64` which covers the core I/O syscalls relevant to OSD profiling.

3. **Redundant `-g` flag with `--call-graph dwarf`**: The command `perf record -F 99 -p $OSD_PID -g --call-graph dwarf -- sleep 30` had both `-g` (which defaults to frame-pointer unwinding) and `--call-graph dwarf`. The `--call-graph dwarf` overrides `-g`, making it redundant and confusing. Removed `-g` to leave only `--call-graph dwarf`.

4. **Invalid Ceph admin socket command**: `ceph daemon osd.0 bluestore bluefs stats` is not a valid command — `bluestore` and `bluefs` are separate command prefixes and cannot be chained. Changed to `ceph daemon osd.0 perf dump rocksdb | grep compact` which correctly queries RocksDB compaction counters via the OSD's performance dump.

## Review Notes
- The sample `perf report` output shows BlueStore and RocksDB as separate shared objects (`libbluestore.so`, `librocksdb.so`). In many Ceph builds these are statically linked into the `ceph-osd` binary. The sample output is illustrative and acceptable but may not match all deployments.
- The Kubernetes container profiling section uses `docker inspect`/`docker ps` which assumes a Docker runtime. Modern Kubernetes clusters (1.24+) typically use containerd, where `crictl` would be used instead. This is noted but not changed since Docker-based setups still exist.
- The `OSD_POD` variable in the Kubernetes section is set but never referenced in the subsequent `nsenter` command. This is a minor dead-code issue but does not affect correctness.
- The `pgrep -f 'ceph-osd -i 0'` uses `-i` (short for `--id`), which is valid but some deployments use the long form `--id`. The pattern may not match in all environments.
