# Validation Summary: How to Benchmark Rook-Ceph Storage Performance with fio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage — RBD block and CephFS filesystem)
- Kubernetes (Jobs, PVCs, StorageClasses)
- fio (Flexible I/O Tester)
- libaio (Linux Async I/O engine)
- Nixery (on-the-fly Docker image builder from Nix packages)

## Sources Consulted
- fio official documentation — https://fio.readthedocs.io/en/latest/fio_doc.html
- Kubernetes Job API reference — https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes PersistentVolumeClaim API reference — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Rook Ceph Storage documentation — https://rook.io/docs/rook/latest/
- Rook Ceph Toolbox documentation — https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph CLI reference (ceph -w, ceph osd perf) — https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
No technical issues found.

## Review Notes
- All fio parameters are correct and well-chosen for their respective benchmark scenarios (4K random for IOPS, 1M sequential for throughput, 70/30 mixed for OLTP simulation).
- The CephFS benchmark correctly uses `--ioengine=sync` instead of `libaio` and omits `--direct=1`, which is appropriate since direct I/O and Linux AIO can be unreliable on CephFS mounts.
- Each CephFS parallel pod writes to a unique file via `$(hostname)`, correctly avoiding write conflicts on the shared filesystem.
- The `nixery.dev/shell/fio` image is a convenient choice for benchmarking but relies on an external service; production users may want to build or pin their own fio image.
- Steps 2-5 all reference the same `fio-rbd-pvc` (ReadWriteOnce). Users running these sequentially should delete the previous Job before starting the next, since only one pod can mount an RWO PVC at a time. This is an operational detail rather than a technical error.
- The `--timeout=120s` on `kubectl wait` is reasonable for a 60-second fio run plus container startup overhead.
