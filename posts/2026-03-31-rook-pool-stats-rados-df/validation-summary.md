# Validation Summary: How to View Pool Statistics with rados df and ceph osd pool stats

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- RADOS (Reliable Autonomic Distributed Object Store)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph rados man page: https://www.mankier.com/8/rados
- Ceph source code (rados.cc): https://github.com/ceph/ceph/blob/main/src/tools/rados/rados.cc — confirmed `rados df` respects the `-p`/`--pool` flag for pool filtering
- Ceph official documentation for `ceph osd pool stats`: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ubuntu rados man page: https://manpages.ubuntu.com/manpages/focal/en/man8/rados.8.html

## Issues Found
No technical issues found.

## Review Notes
- The command `rados df --pool replicapool` places the `--pool` global option after the `df` subcommand, which is non-canonical (the conventional form is `rados --pool replicapool df`). However, Ceph's argument parser is position-agnostic and processes flags regardless of their position relative to the subcommand, so this works correctly in practice. The second example `rados -p replicapool df` uses the canonical ordering.
- The pool filtering behavior of `rados df` is not explicitly documented in the official man page (which categorizes `df` as a "Global Command"), but is confirmed by the Ceph source code. This is an under-documented but real and stable feature.
- All sample output formats are consistent with modern Ceph versions (Nautilus and later).
- The distinction between `rados df` (cumulative stats) and `ceph osd pool stats` (live I/O rates) is accurately described.
