# How to Use the ceph health detail Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Health, Monitoring, Administration

Description: Master the ceph health detail command to get comprehensive cluster health information and understand every warning and error code Ceph reports.

---

## Overview of ceph health detail

The `ceph health detail` command provides a comprehensive view of all active health checks in your Ceph cluster. Unlike `ceph status` which gives a high-level summary, `health detail` breaks down each warning and error into actionable items with specific check codes.

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Reading the Output Structure

A typical `health detail` output looks like this:

```text
HEALTH_WARN 3 osds down; 1 host (3 osds) down; Degraded data redundancy: 45/270 objects degraded (16.667%), 2 pgs degraded
    OSD_DOWN 3 osds down
        osd.3 (root=default, host=node2) is down
        osd.4 (root=default, host=node2) is down
        osd.5 (root=default, host=node2) is down
    OSD_HOST_DOWN 1 host (3 osds) down
        host node2 (root=default) has 3 osds
            osd.3 osd.4 osd.5
    PG_DEGRADED Degraded data redundancy: 45/270 objects degraded (16.667%), 2 pgs degraded
        pg 2.0 is active+degraded, acting [0,2]
        pg 2.1 is active+degraded, acting [1,2]
```

Each section starts with a health check code (e.g., `OSD_DOWN`, `PG_DEGRADED`) that identifies the category of the problem.

## Common Health Check Codes and Their Meanings

### OSD-Related Checks

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail | grep -A5 "OSD_"
```

| Code | Meaning |
|------|---------|
| `OSD_DOWN` | One or more OSDs are down |
| `OSD_HOST_DOWN` | An entire host with OSDs is unreachable |
| `OSDMAP_FLAGS` | Operational flags like noout, noin are set |
| `OSD_FULL` | OSD is at or near full capacity |
| `OSD_NEARFULL` | OSD is approaching full capacity |
| `OSD_BACKFILLFULL` | OSD is too full to accept backfill |

### PG-Related Checks

| Code | Meaning |
|------|---------|
| `PG_DEGRADED` | PGs have fewer than desired replicas |
| `PG_AVAILABILITY` | PGs are not active and unable to serve I/O |
| `PG_DAMAGED` | Data corruption detected |
| `PG_NOT_SCRUBBED` | PGs have not been scrubbed recently |
| `PG_NOT_DEEP_SCRUBBED` | PGs have not been deep-scrubbed |

### Monitor-Related Checks

| Code | Meaning |
|------|---------|
| `MON_DOWN` | One or more monitors are offline |
| `MON_CLOCK_SKEW` | Clock difference between monitors is too large |
| `MON_DISK_LOW` | Monitor disk space is low |

## Filtering health detail Output

Get only errors (ignoring warnings):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail | grep "HEALTH_ERR" -A 50
```

Use JSON output for programmatic processing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail --format json-pretty
```

```text
{
    "status": "HEALTH_WARN",
    "checks": {
        "OSD_DOWN": {
            "severity": "HEALTH_WARN",
            "summary": {
                "message": "2 osds down",
                "count": 2
            },
            "detail": [
                {
                    "message": "osd.3 (root=default, host=node2) is down"
                },
                {
                    "message": "osd.4 (root=default, host=node2) is down"
                }
            ],
            "muted": false
        }
    },
    "mutes": []
}
```

## Parsing health detail with Scripts

```bash
#!/bin/bash
# check-ceph-health.sh - Parse health detail for monitoring

NAMESPACE="rook-ceph"
OUTPUT=$(kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph health detail --format json 2>/dev/null)

STATUS=$(echo $OUTPUT | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['status'])")
echo "Cluster Status: $STATUS"

if [ "$STATUS" != "HEALTH_OK" ]; then
  echo "Active Health Checks:"
  echo $OUTPUT | python3 -c "
import sys, json
d = json.load(sys.stdin)
for code, check in d.get('checks', {}).items():
    print(f\"  [{check['severity']}] {code}: {check['summary']['message']}\")
"
fi
```

## Muting Non-Critical Warnings

If a warning is expected and you want to suppress it temporarily:

```bash
# Mute a specific health check for 1 hour
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health mute OSDMAP_FLAGS 1h

# Check muted items (listed in the "mutes" array of health detail output)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail --format json-pretty

# Unmute when done
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health unmute OSDMAP_FLAGS
```

## Using health detail in Automation

Integrate `health detail` into a Kubernetes CronJob for periodic health reporting:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-health-report
  namespace: rook-ceph
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: ceph-health
            image: rook/ceph:v1.13.0
            command:
            - /bin/bash
            - -c
            - |
              STATUS=$(ceph health detail --format json | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
              if [ "$STATUS" = "HEALTH_ERR" ]; then
                echo "CRITICAL: Ceph cluster is in error state"
                ceph health detail
                exit 1
              fi
          restartPolicy: OnFailure
```

## Summary

The `ceph health detail` command is the primary diagnostic tool for understanding cluster health. It provides structured health check codes, detailed messages about affected components, and supports JSON output for automation. Use it as the first step in any Ceph troubleshooting workflow and integrate it into monitoring scripts to catch issues before they escalate.
