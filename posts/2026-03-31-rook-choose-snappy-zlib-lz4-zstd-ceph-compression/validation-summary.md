# Validation Summary: How to Choose Between Snappy, Zlib, LZ4, and Zstd for Ceph Compression

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph BlueStore compression
- Snappy compression algorithm
- LZ4 compression algorithm
- Zlib compression algorithm
- Zstd (Zstandard) compression algorithm
- Rook (Ceph operator for Kubernetes)
- rados CLI benchmarking tool

## Sources Consulted
- zstd CLI help output (`zstd --help`, v1.5.7) to verify benchmark flags
- Ceph official documentation for BlueStore compression (Reef/Squid releases) to verify `ceph osd pool set` syntax, supported algorithms, and default algorithm
- Ceph documentation for `rados bench` command syntax and options
- Official LZ4 and Snappy project benchmarks for approximate speed/ratio validation

## Issues Found
1. **Invalid zstd benchmark flag `--bench-unlink`** (line 80): The command `zstd -b -e9 --bench-unlink /tmp/sample-data.bin` used a non-existent flag `--bench-unlink`. This flag does not exist in any version of the zstd CLI. Removed the flag so the command now reads `zstd -b -e9 /tmp/sample-data.bin`, which correctly benchmarks compression levels 1 through 9 on the given file.

## Review Notes
- The post does not mention that `compression_mode` must also be set on the pool (e.g., `aggressive` or `force`) for compression to take effect. The default `compression_mode` is `none`, meaning data will not be compressed even after setting the algorithm. This is outside the scope of the post (which focuses on algorithm selection) but could be a useful addition in the future.
- The benchmark script uses `-b 4096` (4 KB block size), which is quite small for compression benchmarking. A larger block size (e.g., 4 MB) would be more representative of typical Ceph workloads, but the command is syntactically valid.
- The approximate speed and ratio figures in the comparison table are in the right ballpark based on commonly cited benchmarks, though actual numbers vary significantly by hardware and data type. The relative ordering of algorithms is correct.
