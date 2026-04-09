# How to Monitor Stretch Mode Health Warnings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Mode, Monitoring, Health

Description: Learn how to monitor and interpret Ceph stretch mode health warnings including site imbalance, degraded PGs, and connectivity alerts.

---

## Common Stretch Mode Health Warnings

Ceph stretch mode introduces several health warnings specific to multi-site operation. Understanding each warning helps you distinguish normal degraded states from critical failures.

Check all current warnings:

```bash
ceph health detail
```

## DEGRADED_STRETCH_MODE

This warning appears when one site is down or has fewer OSDs than the other site:

```text
HEALTH_WARN 1 osds down in stretch mode; 2 pgs degraded
DEGRADED_STRETCH_MODE 1 osds down in stretch mode
```

To identify which site and OSDs are affected:

```bash
ceph osd tree | grep -E "down|CRUSH"
ceph osd df | grep down
```

## NONEXISTENT_MON_CRUSH_LOC_STRETCH_MODE

This warning indicates that stretch mode configuration is incomplete. Monitors may not have CRUSH location labels set:

```bash
ceph mon dump | grep crush_location
```

Set missing location labels:

```bash
ceph mon set_location mon-dc1a datacenter=dc1
ceph mon set_location mon-dc2a datacenter=dc2
```

## STRETCH_MODE_BUCKET_WEIGHT_IMBALANCE

If one site has significantly more OSDs than the other, CRUSH placement may favor one site. Check OSD distribution:

```bash
ceph osd tree | grep -A2 "datacenter"
```

Rebalance by adjusting CRUSH weights:

```bash
ceph osd reweight-by-utilization
```

## Monitoring PG Distribution Across Sites

Verify that PGs are evenly distributed between sites:

```bash
ceph pg dump | awk '{print $1}' | grep -v pg | head -5
ceph osd map <pool> <object>
```

Use a script to check how many PGs have primaries on each site:

```bash
ceph pg dump --format json 2>/dev/null | python3 -c "
import sys, json, subprocess
tree = json.loads(subprocess.check_output(
    ['ceph', 'osd', 'tree', '--format', 'json']).decode())
nodes = {n['id']: n for n in tree['nodes']}
osd_to_site = {}
for node in tree['nodes']:
    if node.get('type') == 'datacenter':
        stack = list(node.get('children', []))
        while stack:
            cid = stack.pop()
            if cid in nodes:
                if nodes[cid]['type'] == 'osd':
                    osd_to_site[cid] = node['name']
                stack.extend(nodes[cid].get('children', []))
data = json.load(sys.stdin)
counts = {}
for pg in data.get('pg_stats', []):
    up = pg.get('up', [])
    if up:
        site = osd_to_site.get(up[0], 'unknown')
        counts[site] = counts.get(site, 0) + 1
for site in sorted(counts):
    print(f'{site}: {counts[site]} PGs')
"
```

## Setting Up Alerts with Prometheus

Configure Prometheus alerts for stretch mode conditions:

```yaml
groups:
  - name: ceph_stretch
    rules:
      - alert: CephStretchModeDegraded
        expr: ceph_health_status == 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Ceph stretch mode degraded"
          description: "Ceph cluster is in ERROR state, possible site failure"
      - alert: CephStretchModeWarn
        expr: ceph_health_status == 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Ceph stretch mode warning"
```

## Continuous Monitoring with ceph -w

Use the watch command to monitor stretch mode events in real time:

```bash
ceph -w | grep -E "stretch|site|down|degraded"
```

## Summary

Monitoring Ceph stretch mode requires tracking site-specific OSD health, PG distribution across sites, and monitor quorum status. Common warnings like DEGRADED_STRETCH_MODE should trigger immediate investigation to determine whether a site is fully down or only partially affected. Integrating Prometheus alerts ensures you are notified proactively before a minor issue becomes a service outage.
