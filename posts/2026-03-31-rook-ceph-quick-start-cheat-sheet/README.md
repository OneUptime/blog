# How to Create a Ceph Quick Start Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cheat Sheet, Reference, Operation

Description: Build a Ceph quick-start cheat sheet covering the most frequently used commands for health checks, OSD management, pool operations, and troubleshooting.

---

A well-organized Ceph cheat sheet reduces the cognitive load on engineers handling incidents or performing routine operations. This guide provides a ready-to-use reference covering the most important commands.

## Cluster Health

```bash
ceph status                    # Overall cluster status
ceph health detail             # Detailed health warnings/errors
ceph -w                        # Watch live cluster events
ceph log last 50               # Last 50 cluster log entries
```

## OSD Management

```bash
ceph osd tree                  # OSD topology with weights
ceph osd stat                  # OSD count and state summary
ceph osd ls                    # List all OSD IDs
ceph osd df                    # Per-OSD disk usage
ceph osd perf                  # Per-OSD latency stats

ceph osd out osd.N             # Mark OSD out (start data migration)
ceph osd in osd.N              # Mark OSD in
ceph osd down osd.N            # Mark OSD down (no traffic)
ceph osd purge osd.N --yes-i-really-mean-it  # Remove OSD permanently
```

## Pool Operations

```bash
ceph osd lspools                         # List pools
ceph osd pool ls detail                  # Pools with details
ceph osd pool stats                      # Per-pool I/O stats
ceph osd pool create POOL 32             # Create pool with 32 PGs
ceph osd pool delete POOL POOL --yes-i-really-really-mean-it  # Delete pool
ceph osd pool set POOL size 3            # Set replication factor
ceph osd pool get POOL all               # Show all pool settings
```

## PG Management

```bash
ceph pg stat                             # PG count and states
ceph pg dump_stuck                       # Stuck PGs
ceph pg dump_stuck inactive             # Inactive PGs
ceph pg dump_stuck unclean             # Unclean PGs
ceph pg repair PGID                      # Repair inconsistent PG
```

## Monitor Management

```bash
ceph mon stat                # MON quorum status
ceph mon dump                # Full MON map
ceph quorum_status           # Quorum members and leader
```

## RBD Operations

```bash
rbd ls POOL                              # List images in pool
rbd info POOL/IMAGE                      # Image details
rbd create --size 10240 POOL/IMAGE       # Create 10 GB image
rbd snap create POOL/IMAGE@SNAPNAME      # Create snapshot
rbd snap ls POOL/IMAGE                   # List snapshots
rbd rm POOL/IMAGE                        # Delete image
rbd bench POOL/IMAGE --io-type write     # Benchmark writes
```

## RADOS Operations

```bash
rados lspools                            # List pools
rados -p POOL ls                         # List objects in pool
rados bench -p POOL 30 write --no-cleanup   # Write benchmark
rados bench -p POOL 30 seq              # Sequential read benchmark
```

## Config Management

```bash
ceph config dump                         # All non-default settings
ceph config set osd KEY VALUE            # Set OSD config key
ceph config get osd KEY                  # Get OSD config value
ceph daemon osd.0 config show | grep KEY # Show runtime config
```

## Summary

This cheat sheet covers health, OSD, pool, PG, MON, RBD, RADOS, and config commands that cover 90% of day-to-day Ceph operations. Print it or keep it in your team's wiki for quick reference during incidents. Supplement it with your cluster-specific commands for pool names and OSD counts.
