# Validation Summary: How to Test Compression Impact on Ceph Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (BlueStore compression)
- Rook (Ceph operator for Kubernetes)
- rados bench (Ceph benchmarking tool)
- fio (Flexible I/O Tester) with rbd ioengine
- RBD (RADOS Block Device)
- kubectl
- mpstat

## Sources Consulted
- Ceph official documentation on BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph rados bench documentation: https://docs.ceph.com/en/latest/man/8/rados/
- fio documentation on rbd ioengine: https://fio.readthedocs.io/en/latest/fio_doc.html
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- kubectl top pods documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top_pod/

## Issues Found
- **Unnecessary `rbd map` commands in Test 3**: The fio commands use `--ioengine=rbd` which accesses RBD images directly via `librbd`, bypassing the kernel. The `rbd map` commands mapped the images as kernel block devices, but these mapped devices were never used by the fio commands. Removed the `rbd map` commands to avoid confusion. The `rbd create` commands were kept as they are needed to create the images that fio accesses.

## Review Notes
- The `rados bench write` command generates data with repeating patterns, which is moderately compressible. The post correctly labels this as "compressible data" in Test 1, which is a reasonable characterization.
- The pool creation uses a fixed PG count of 32. In newer Ceph releases with PG autoscaling enabled by default, the explicit PG count may be overridden. This is fine for a benchmarking tutorial.
- The typical performance numbers cited in "Analyzing Results" are reasonable ballpark figures for NVMe clusters with snappy compression, though actual results will vary significantly by hardware and workload.
