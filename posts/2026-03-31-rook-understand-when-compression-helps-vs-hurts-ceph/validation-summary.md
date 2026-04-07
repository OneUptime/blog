# Validation Summary: How to Understand When Compression Helps vs Hurts in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (BlueStore compression)
- Rook (Ceph operator for Kubernetes)
- zstd, lz4, snappy compression algorithms
- kubectl CLI
- jq for JSON processing

## Sources Consulted
- Ceph BlueStore compression documentation (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression)
- zstd CLI man page and --help output (https://facebook.github.io/zstd/zstd_manual.html)
- lz4 CLI usage documentation
- Ceph `ceph df detail` output format and pool stats fields
- Rook Ceph OSD pod label conventions

## Issues Found
- **Incorrect `zstd` command for testing compression ratio**: The post used `zstd --test -v /var/log/app/*.log`. The `--test` (`-t`) flag is for verifying the integrity of already-compressed `.zst` files, not for measuring compression ratio on uncompressed data. Running this on plain log files would produce an error ("not in zstd format"). Fixed to `zstd -c -v /var/log/app/*.log > /dev/null`, which compresses to stdout (discarded) while printing compression statistics via `-v`. The expected output was also updated to match zstd's actual verbose output format.

## Review Notes
- The `ceph df detail` JSON path `.pools[].stats.compress_bytes_used` and `.compress_under_bytes` are correct for current Ceph releases (Quincy/Reef).
- The BlueStore compression modes (`none`, `aggressive`, `force`) and algorithms (`zstd`, `snappy`, `lz4`) referenced in the decision framework are all valid.
- The `ceph osd pool set` command for disabling compression is correct.
- The 70% OSD CPU threshold mentioned as a guideline is a reasonable rule of thumb, though not an official Ceph recommendation.
- The `lz4 -c` command for checking compressibility is correct (compresses to stdout by default).
