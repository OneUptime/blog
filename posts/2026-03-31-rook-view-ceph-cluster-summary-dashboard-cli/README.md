# How to View Ceph Cluster Summary Dashboard via CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitoring, Dashboard, CLI, Status

Description: Get a comprehensive Ceph cluster health overview from the command line, covering health status, capacity, IOPS, and active operations.

---

## The `ceph status` Command

The primary cluster summary command is:

```bash
ceph status
```

Or the shorter alias:

```bash
ceph -s
```

Sample output:

```yaml
  cluster:
    id:     a7f8c123-4567-89ab-cdef-0123456789ab
    health: HEALTH_OK

  services:
    mon: 3 daemons, quorum mon1,mon2,mon3 (age 2w)
    mgr: mon1(active, since 2w), standbys: mon2
    osd: 24 osds: 24 up (since 3w), 24 in (since 3w)
    rgw: 2 daemons active (2 hosts, 1 zones)

  data:
    volumes: 1/1 healthy
    pools:   8 pools, 256 pgs
    objects: 1.23M objects, 5.8 TiB
    usage:   17 TiB used, 73 TiB / 100 TiB avail
    pgs:     256 active+clean

  io:
    client:   1.2 MiB/s rd, 5.4 MiB/s wr, 120 op/s rd, 85 op/s wr
```

## Continuous Monitoring

Watch the cluster status update every 2 seconds:

```bash
watch -n 2 ceph status
```

## Checking Health in Detail

```bash
ceph health detail
```

This explains each warning or error with affected OSD IDs, PGs, or daemon names.

## Viewing Active Operations

See all in-progress operations:

```bash
ceph ops
```

Check for slow operations:

```bash
ceph dump_historic_slow_ops
```

## Monitoring Throughput and IOPS

If the `iostat` MGR module is enabled:

```bash
ceph iostat
```

Or use the real-time event stream:

```bash
ceph -w
```

`ceph -w` streams cluster events (OSD state changes, PG recoveries, etc.) in real time - useful for watching a cluster during maintenance.

## Getting the MGR Dashboard URL

If the Ceph Dashboard is enabled via MGR:

```bash
ceph mgr services
```

Output:

```json
{
  "dashboard": "https://mon1.example.com:8443/"
}
```

## Quick Health Checks for Scripting

For use in scripts or CI pipelines, check cluster health programmatically:

```bash
# Returns 0 on HEALTH_OK, non-zero on warnings/errors
status=$(ceph health | awk '{print $1}')
printf '%s\n' "$status"
test "$status" = "HEALTH_OK"
```

## Summary

`ceph status` (or `ceph -s`) provides a comprehensive one-screen cluster summary including health, services, capacity, PG state, and live I/O rates. Use `ceph -w` for a streaming event log during maintenance, `ceph health detail` for specific issue diagnosis, `ceph ops` and `ceph dump_historic_slow_ops` to inspect active or slow operations, and `ceph mgr services` to locate the web dashboard URL.
