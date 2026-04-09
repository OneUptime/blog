# Validation Summary: How to Fix BLUESTORE_FREE_FRAGMENTATION Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore backend)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring and alerting)
- Kubernetes (Rook toolbox access)

## Sources Consulted
- [Ceph source code - BlueStore.cc (health check name and alert logic)](https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueStore.cc) — confirmed health check identifier is `BLUESTORE_FREE_FRAGMENTATION` at line 19572
- [Ceph source code - global.yaml.in (config option defaults)](https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in) — confirmed `bluestore_warn_on_free_fragmentation` default is 0.8, and `bluestore_fragmentation_check_period` default is 3600
- [Ceph PR #61910 - Add health warning for bluestore fragmentation (Squid backport)](https://github.com/ceph/ceph/pull/61910)
- [Ceph PR #54258 - Add bluestore fragmentation micros to Prometheus](https://github.com/ceph/ceph/pull/54258) — confirmed perf counter name is `fragmentation_micros`
- [Ceph PR #29425 - Inspect allocations in BlueStore](https://github.com/ceph/ceph/pull/29425/files) — admin socket commands for allocator inspection
- [Rook issue #16858 - BLUESTORE_FREE_FRAGMENTATION](https://github.com/rook/rook/issues/16858) — real-world health check output
- [Ceph blog - Difference between ceph osd reweight and ceph osd crush reweight](https://ceph.io/en/news/blog/2014/difference-between-ceph-osd-reweight-and-ceph-osd-crush-reweight/)
- [Red Hat Ceph Storage 5 Administration Guide - BlueStore](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/osd-bluestore) — fragmentation score ranges

## Issues Found

1. **Incorrect health check name**: The post used `BLUESTORE_FRAGMENTATION` throughout, but the actual Ceph health check identifier is `BLUESTORE_FREE_FRAGMENTATION` (confirmed from BlueStore.cc source code line 19572). Changed all occurrences.

2. **Wrong admin socket command**: The post used `ceph daemon osd.4 bluestore stats` and `ceph tell osd.* bluestore stats`, but the correct command is `bluestore allocator score block` (confirmed from the config option description in global.yaml.in which explicitly states: "This is the value reported by the admin socket command 'bluestore allocator score block'"). Fixed both occurrences.

3. **Incorrect config option names**: The post used `bluestore_fragmentation_score_warn` and `bluestore_fragmentation_score_alert`, but the actual config option is `bluestore_warn_on_free_fragmentation` (a single threshold, no separate alert/critical levels). Replaced with the correct option name and added `bluestore_fragmentation_check_period` as a useful companion setting.

4. **Wrong default threshold**: The post stated the default warning threshold is 0.7, but the actual default is 0.8 (confirmed from global.yaml.in). Fixed throughout the post.

5. **Incorrect terminology - "CRUSH weight" vs "reweight"**: The post described the defragmentation procedure as reducing "the OSD's CRUSH weight" but the command `ceph osd reweight` sets the OSD's reweight factor (0-1 range), which is different from the CRUSH weight set by `ceph osd crush reweight`. Fixed the description to use "reweight" consistently.

6. **Inaccurate fragmentation score ranges**: The original ranges (< 0.7 Normal, 0.7-0.9 Warning, > 0.9 Critical) did not match official documentation. Updated to match the Red Hat Ceph Storage documentation ranges: < 0.4 tiny, 0.4-0.7 small/acceptable, 0.7-0.9 considerable but safe, > 0.9 severe.

7. **Wrong Prometheus metric name in alert rule**: The post used `ceph_bluestore_fragmentation_score` but the actual perf counter is named `fragmentation_micros` (confirmed from PR #54258), which stores the score multiplied by 1,000,000. Updated the alert expression to use `ceph_bluestore_fragmentation_micros > 800000` with an explanatory note.

8. **Non-functional automation script**: The script used `ceph osd df -f json` to read a `fragmentation_score` field, but `ceph osd df` does not include fragmentation scores in its output. Rewrote the script to iterate over OSDs using `ceph tell osd.$osd bluestore allocator score block` to get actual fragmentation scores.

9. **Incorrect example health output**: Updated the example `ceph health detail` output to match the actual format observed in production (from Rook issue #16858 and the source code alert format).

## Review Notes
- The `BLUESTORE_FREE_FRAGMENTATION` health check was added in Ceph Squid (19.2.3) via PR #61910. Users on older Ceph versions (Reef and earlier) will not see this health check. The post does not mention version requirements, which could be noted in a future update.
- The reweight-based defragmentation approach is a well-known community technique but can be disruptive in production. It causes significant data movement and should be done one OSD at a time during maintenance windows. The post could benefit from a stronger caution about this.
- The `bluestore_compression_mode aggressive` setting compresses all data regardless of compressibility, which may increase CPU usage with minimal space savings for already-compressed data. This tradeoff is not mentioned.
