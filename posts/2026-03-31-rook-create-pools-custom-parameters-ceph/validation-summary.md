# Validation Summary: How to Create Pools with Custom Parameters in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Ceph CLI (`ceph osd pool` commands)
- BlueStore compression (zstd, compression modes)
- CRUSH rules and device class targeting
- Ceph pg_autoscaler module
- Rook (mentioned in tags, not directly in commands)

## Sources Consulted
- Ceph official documentation: Pool operations (`ceph osd pool create` syntax and positional arguments)
- Ceph official documentation: Pool configuration (`ceph osd pool set` properties including size, min_size, crush_rule, compression_mode, compression_algorithm, pg_autoscale_mode)
- Ceph official documentation: BlueStore compression (compression_mode values: none, passive, aggressive, force; supported algorithms including zstd)
- Ceph official documentation: Pool application tagging (`ceph osd pool application enable` with standard tags rbd, rgw, cephfs)
- Ceph official documentation: Pool quotas (`set-quota`, `get-quota` subcommands with max_bytes and max_objects)
- Ceph Nautilus (14.x) release notes: pg_autoscaler module introduction

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd pool create <pool> <pg_num> <pgp_num> replicated` syntax with explicit PG counts is the legacy approach. Modern Ceph clusters (Nautilus 14.x+) with pg_autoscaler enabled can omit PG counts entirely. The post correctly covers both approaches.
- The description of `aggressive` compression mode as compressing "all data that benefits from it" is a reasonable simplification. Technically, `aggressive` compresses unless client hints say not to, and BlueStore will discard the compressed version if it is not smaller than the original.
- The post tags mention Rook and Kubernetes, but all commands shown are native Ceph CLI commands. In a Rook-managed cluster, pools are typically created via CephBlockPool CRDs rather than CLI commands. This is not incorrect — the CLI commands work on any Ceph cluster — but readers using Rook may need to translate these to CRD specifications.
