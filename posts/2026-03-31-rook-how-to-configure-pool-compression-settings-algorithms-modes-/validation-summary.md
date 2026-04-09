# Validation Summary: How to Configure Pool Compression Settings in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph BlueStore (inline compression)
- Rook (Kubernetes Ceph operator)
- Compression algorithms: snappy, zlib, zstd, lz4

## Sources Consulted
- Ceph official documentation: BlueStore configuration reference (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
1. **Misleading Python script in "Measuring Compression Savings" section.** The script was labeled "Pool-level compression ratio" but did not compute a compression ratio. It referenced `client_stats` which is not a field in the `ceph osd pool stats --format json` output (the actual field is `client_io_rate`), and used `write_bytes_sec` which is an I/O throughput metric unrelated to compression. The variable `stored` was assigned but never meaningfully used. Replaced the entire Python pipeline with the simpler and correct `ceph osd pool stats compressed-pool` command, which shows pool I/O statistics without misleading the reader about compression ratio output.

## Review Notes
- The `ceph osd pool create compressed-pool 128 128 replicated` syntax with explicit PG counts is older style. Modern Ceph (Nautilus+) supports the PG autoscaler, so `ceph osd pool create compressed-pool replicated` would also work. The explicit PG count syntax remains valid, so this was not changed.
- The `ceph df detail` and `ceph daemon osd.0 perf dump | grep compress` commands in the same section are the correct ways to observe compression savings. The BlueStore perf counters (`bluestore_compressed_original`, `bluestore_compressed_allocated`) provide actual compression ratio data.
- The Rook CephBlockPool YAML only shows `compressionMode`. Rook does not expose `compressionAlgorithm` directly in the CRD spec; the algorithm must be set via Ceph CLI or toolbox if a non-default algorithm is desired. This is a minor omission but not an error.
