# Validation Summary: How to Use the Iostat Module in Ceph Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Storage cluster)
- Ceph Manager (mgr) iostat module
- Ceph CLI (`ceph iostat`, `ceph osd pool stats`, `ceph osd perf`)
- Ceph Prometheus module (metrics exporter)
- Rook (Kubernetes Ceph operator, referenced in tags)

## Sources Consulted
- Ceph official documentation for the iostat module: https://docs.ceph.com/en/latest/mgr/iostat/
- Ceph CLI source code (`src/ceph.in`): https://github.com/ceph/ceph/blob/main/src/ceph.in — confirms `-p`/`--period` flag with default of 1 second
- Ceph iostat module source (`src/pybind/mgr/iostat/module.py`): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/iostat/module.py
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph `osd perf` command documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/

## Issues Found
No technical issues found.

## Review Notes
- The example output for `ceph iostat` is illustrative rather than exact terminal output. The actual formatting varies slightly by Ceph version, but the metrics shown (read/write throughput, IOPS for client and recovery I/O) are accurate.
- The "Backfill I/O" line in the example output is a reasonable inclusion since backfill is a distinct I/O category in Ceph, though some versions may group it under recovery I/O in the iostat display.
- The `ceph osd perf` output format is also stylized for readability; actual output is a formatted table, but the column names (apply_latency_ms, commit_latency_ms) are correct.
- The Prometheus metric `ceph_osd_op_r` and port 9283 are both accurate for the Ceph mgr Prometheus module.
