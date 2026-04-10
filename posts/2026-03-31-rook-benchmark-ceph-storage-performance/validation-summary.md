# Validation Summary: How to Benchmark Ceph Storage Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (rados bench, RADOS object store)
- fio (Flexible I/O Tester) with rbd and libaio ioengines
- Ceph RBD (RADOS Block Device)
- CephFS (Ceph File System)
- Rook (Kubernetes storage orchestrator)
- Kubernetes (Pod spec for running benchmarks)

## Sources Consulted
- Red Hat Ceph Storage 5 Administration Guide — Benchmarking Performance: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/ceph-performance-benchmarking
- IBM Ceph 7.1 Benchmarking Documentation: https://www.ibm.com/docs/en/storage-ceph/7.1.0?topic=benchmark-benchmarking-ceph-performance
- fio official documentation (readthedocs): https://fio.readthedocs.io/en/latest/fio_doc.html
- fio GitHub repository — rbd.fio example: https://github.com/axboe/fio/blob/master/examples/rbd.fio
- fio GitHub repository — rbd engine source: https://github.com/axboe/fio/blob/master/engines/rbd.c
- Ceph.io blog — rbd ioengine for fio: https://ceph.io/en/news/blog/2014/rbd-ioengine-for-fio/

## Issues Found

1. **Description mentioned cosbench but post never covers it**: The description claimed the post covered "rados bench, fio, and cosbench" but cosbench was never discussed in the post. Removed "and cosbench" from the description to accurately reflect the content.

2. **Incorrect rados bench cleanup command**: The post had `rados bench -p <pool-name> 30 write --cleanup` as the cleanup command. This is wrong — `--cleanup` is not a valid flag for `rados bench write`. This command would either error or run a new 30-second write benchmark. The correct way to clean up objects left by a previous `--no-cleanup` run is `rados -p <pool-name> cleanup`. Fixed to the correct syntax.

3. **Missing `--time_based` in command-line fio examples**: The fio job file correctly included `time_based=1`, but the three command-line fio RBD examples omitted `--time_based`. Without this flag, fio may stop before the full `--runtime` duration if the workload completes early, leading to inconsistent benchmark results. Added `--time_based` to all three command-line fio RBD examples.

## Review Notes
- The CephFS mount command uses the legacy v1 messenger syntax with port 6789. Modern Ceph deployments (Nautilus and later) default to msgr2 on port 3300. The old syntax still works but readers with newer clusters may need to adjust.
- The CephFS mount syntax (`mount -t ceph mon1:6789,mon2:6789:/`) is the legacy format. Modern Ceph (Pacific+) supports the newer `mount -t ceph admin@<fsid>.cephfs=/` syntax. Both work, but the newer syntax is preferred for recent deployments.
- The `nixery.dev/fio` container image in the Kubernetes example is from a real service (Nixery) that builds images on-the-fly from Nix packages. This is a valid but somewhat niche choice — readers may prefer a more commonly used fio container image.
- The fio CephFS command-line examples also lack `--time_based`, but since they specify `--size` (which defines the total data to write/read), this is less impactful — fio will process the full size or hit the runtime limit.
