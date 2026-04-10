# Validation Summary: How to Write a Ceph Performance Benchmarking Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS, RBD)
- Rook (Kubernetes Ceph operator)
- Kubernetes (`kubectl exec`)
- Bash scripting
- Python 3 (result parsing)
- fio (Flexible I/O Tester)
- rados bench CLI

## Sources Consulted
- Ceph official documentation — rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Red Hat Ceph Storage Benchmarking Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/ceph-performance-benchmarking
- Ceph RBD documentation — rbd create: https://docs.ceph.com/en/latest/man/8/rbd/
- Kubernetes kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html

## Issues Found

1. **`kubectl exec -it` flags used in a script with output redirection**: The `-it` flags (interactive + TTY allocation) were used in `ceph_cmd()`, `rados_cmd()`, and `bench_rbd()`. When stdout is redirected to files (as this script does), `-t` injects carriage return characters (`\r`) into the output, corrupting benchmark data, and produces "stdin is not a terminal" warnings. Removed `-it` from all `kubectl exec` calls, leaving just `kubectl exec`.

2. **Summary incorrectly claims CephFS coverage**: The closing summary stated the script "covers RADOS object storage, RBD block storage, and CephFS" but no CephFS benchmark function exists in the post. Removed the CephFS reference to accurately reflect the script's scope (RADOS and RBD only).

3. **Unused `import json` in Python script**: The `parse-bench-results.py` script imported the `json` module but never used it — the script only parses text output using regex. Removed the unused import.

## Review Notes
- The `ceph osd pool create "$BENCH_POOL" 32 32` command specifies `pgp_num` as a second positional argument. Since Ceph Nautilus (14.x), `pgp_num` automatically tracks `pg_num`, making the second argument redundant. The command still works but is slightly dated syntax.
- The `bench_rbd()` function uses `rbd map` inside the Rook toolbox pod. In standard Rook deployments, the toolbox pod lacks the kernel-level privileges (CAP_SYS_ADMIN, /dev access) needed for `rbd map`. This would require a privileged toolbox or a custom pod. A note about this prerequisite would improve the post.
- The `fio` benchmark uses `--numjobs=4` on a raw block device without `--offset_increment`, meaning all four jobs write to overlapping regions. This isn't incorrect but may not reflect realistic workload patterns.
