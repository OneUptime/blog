# Validation Summary: How to Use fio for Ceph Block Storage Benchmarking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- fio (Flexible I/O Tester)
- Ceph RBD (RADOS Block Device)
- librbd / librados
- Rook (Ceph operator for Kubernetes)
- Kubernetes (Jobs, PVCs)
- libaio

## Sources Consulted
- fio official documentation and source (https://github.com/axboe/fio)
- fio HOWTO and man page for ioengine options, `--enghelp`, `--lat_percentiles`, `--percentile_list` syntax
- Ceph documentation for `ceph osd pool create`, `rbd create`, `rbd rm`, `ceph osd pool delete` commands
- Kubernetes API reference for batch/v1 Job spec

## Issues Found
1. **Incorrect `./configure --enable-rbd` flag** (build-from-source section): fio uses a custom configure script that auto-detects RBD support based on the presence of librbd development headers. There is no `--enable-rbd` flag; using it would cause a configure error. Fixed by changing `./configure --enable-rbd` to `./configure`. The preceding `dnf install -y librados-devel librbd-devel` ensures the headers are present for auto-detection.

## Review Notes
- The `ceph osd pool create fio-test-pool 64 64` syntax with explicit pg_num and pgp_num is valid but older style. Since Ceph Nautilus (14.x+), pgp_num auto-adjusts to match pg_num, so a single argument suffices. Both forms remain accepted.
- The Kubernetes example correctly switches from `ioengine=rbd` to `ioengine=libaio` with `--direct=1`, since inside a pod with a PVC-backed mount the workload goes through the kernel block layer rather than librbd directly. This is an appropriate and well-explained distinction.
- All fio command-line options (`--pool`, `--rbdname`, `--time_based`, `--group_reporting`, `--lat_percentiles`, `--percentile_list`) are correct and current.
- The INI job file format is correct, including the `clientname=admin` rbd engine parameter.
