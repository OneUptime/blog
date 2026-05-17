# Validation Summary: How to Use fio for I/O Performance Benchmarking on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- fio (Flexible I/O Tester)
- Ubuntu (apt package management)
- Linux I/O engines: libaio, io_uring, sync
- Linux kernel io_uring subsystem (5.1+)
- O_DIRECT (direct I/O)
- Bash scripting
- jq / Python3 for JSON parsing of fio output

## Sources Consulted
- fio official documentation: https://fio.readthedocs.io/en/latest/fio_doc.html
- fio man page (command-line options, job file syntax, JSON output schema)
- Linux kernel history for io_uring (merged in 5.1, May 2019)
- Bash reference manual (line continuation and comment behavior)

## Issues Found
- **Broken bash line continuation in the "Testing a Specific Device" example.** The original snippet had inline `#` comments placed after a `\` line continuation:
  ```bash
  --filename=/dev/sdb \    # Replace with your target device
  ```
  In bash, `\` only continues the line when it is the last character on the line. With a space and a `#` comment following, the backslash escapes the space (not the newline), the `#` starts a comment to end of line, and the following line is parsed as a separate command — causing the `fio` invocation to break. Moved the comments above the command so the line continuations work correctly. The trailing comment after `--readonly` had the same readability problem on the last line and was consolidated into the explanatory header.

## Review Notes
- All fio flags, options, and JSON output field paths (`iops`, `bw`, `bw_bytes`, `lat_ns.mean`) were verified against fio's official documentation and are correct.
- `--enghelp=<engine>`, `--readonly`, `--lat_percentiles`, `--clat_percentiles`, `--percentile_list`, and the `new_group` job-file keyword are all valid.
- io_uring kernel availability (5.1+) is correctly stated.
- The quoted IOPS ranges (HDD 100–200, SATA SSD 50K–100K, NVMe 500K–1M+) are reasonable as peak/spec figures at high queue depths. At low queue depths (QD1) actual numbers will be much lower, but the post's tests use sufficiently high `iodepth`/`numjobs` for the cited ranges to be realistic.
- Minor terminology nit (not changed): fio's JSON `bw` field is in KiB/s (1024-based), not strictly KB/s. The post does not surface this distinction, and it's a common simplification.
- The `libaio` ioengine effectively requires `direct=1` for asynchronous behavior; the post correctly pairs them everywhere.
