# How to Interpret Ceph Health Status Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Health, Monitoring, Diagnostic

Description: Learn how to read and interpret Ceph health status reports including HEALTH_WARN and HEALTH_ERR messages to quickly diagnose and resolve cluster issues.

---

Ceph health reports are structured messages that identify issues in your cluster. Understanding how to read and respond to these messages is a core operational skill for managing a Rook-Ceph cluster.

## Health Check Levels

| Level | Severity | Action Required |
|---|---|---|
| `HEALTH_OK` | No issues | None |
| `HEALTH_WARN` | Non-critical issues | Investigate soon |
| `HEALTH_ERR` | Critical issues | Immediate action required |

## Get the Health Summary

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health
```

Sample output:

```text
HEALTH_WARN 1 nearfull osd(s); clock skew detected on mon.b
```

## Get Detailed Health Information

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail
```

Sample detailed output:

```text
HEALTH_WARN 1 nearfull osd(s); clock skew detected on mon.b
[WRN] OSD_NEARFULL: 1 nearfull osd(s)
    osd.3 is near full at 82%
[WRN] MON_CLOCK_SKEW: clock skew detected on mon.b
    mon.b clock skew 0.12s > max 0.05s (latency 0.001s)
```

Each health check has a unique identifier (like `OSD_NEARFULL`) that you can reference in documentation.

## Common Health Checks and Resolutions

### OSD_NEARFULL / OSD_FULL

```text
[WRN] OSD_NEARFULL: osd.3 is near full at 85%
[ERR] OSD_FULL: osd.3 is full at 95%
```

Response: Add more OSDs, increase cluster capacity, or move data to other pools.

### PG_DEGRADED

```text
[WRN] PG_DEGRADED: Degraded data redundancy: 1 pg degraded
    pg 1.5 is active+degraded, acting [0,1]
```

Response: Wait for recovery, or investigate failed OSDs.

### MON_CLOCK_SKEW

```text
[WRN] MON_CLOCK_SKEW: clock skew detected on mon.b
```

Response: Fix NTP synchronization on the affected node.

### POOL_NO_REDUNDANCY

```text
[WRN] POOL_NO_REDUNDANCY: pool 'test-pool' has no redundancy
```

Response: Increase pool replica size or remove single-replica test pools.

## Monitor Health in JSON Format

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Overall status:', data['status'])
for code, check in data.get('checks', {}).items():
    print(f'[{check[\"severity\"]}] {code}: {check[\"summary\"][\"message\"]}')
"
```

## Check Specific Health Check Status

```bash
# Check if a specific health check is active
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep OSD_NEARFULL
```

## Track Health Over Time with Log

```bash
# View recent health events from the cluster log
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph log last 100 | grep -E "(WRN|ERR)"
```

## Mute Known Issues Temporarily

If a health check is a known issue being resolved:

```bash
# Mute for 1 hour
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health mute OSD_NEARFULL 1h --sticky
```

## Summary

Ceph health reports use structured check codes (`OSD_NEARFULL`, `PG_DEGRADED`, `MON_CLOCK_SKEW`) with detailed per-component messages. Use `ceph health` for a summary, `ceph health detail` for root cause analysis, and `--format json` for automated monitoring. Address `HEALTH_ERR` conditions immediately and investigate `HEALTH_WARN` conditions before they escalate.
