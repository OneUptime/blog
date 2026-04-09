# How to Interpret ceph health detail Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitoring

Description: Learn how to read and interpret the ceph health detail command output to diagnose cluster issues and understand health check codes in Ceph.

---

## Overview of ceph health detail

The `ceph health detail` command provides a structured breakdown of all active health conditions in the cluster. Unlike `ceph health`, which shows a single-line summary, `ceph health detail` shows each individual check code, its severity, human-readable message, and affected components.

Run from the Rook toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Anatomy of the Output

A typical output looks like this:

```text
HEALTH_WARN 2 osds down; 1 nearfull osd(s)
[WRN] OSD_DOWN: 2 osds down
    osd.4 (root=default,host=node2) is down
    osd.7 (root=default,host=node3) is down
[WRN] OSD_NEARFULL: 1 nearfull osd(s)
    osd.2 is near full at 83%
```

The output structure is:

- **Summary line** - overall state followed by a human-readable summary of all active checks
- **Check code block** - `[WRN]` or `[ERR]` followed by the machine-readable check code (e.g., `OSD_DOWN`)
- **Detail lines** - indented lines describing each affected component

## Common Health Check Codes

| Code | Severity | Meaning |
|---|---|---|
| `OSD_DOWN` | WRN | One or more OSDs are not running |
| `OSD_NEARFULL` | WRN | An OSD is above the nearfull threshold |
| `OSD_FULL` | ERR | An OSD has reached the full threshold |
| `PG_DEGRADED` | WRN | Placement groups have fewer replicas than desired |
| `PG_AVAILABILITY` | WRN | Some placement groups cannot serve reads or writes |
| `MON_CLOCK_SKEW` | WRN | Monitor clock drift is too high |
| `TELEMETRY_CHANGED` | WRN | Telemetry settings need re-consent |
| `AUTH_BAD_CAPS` | ERR | Auth entities have malformed capabilities |

## Reading JSON Output

For scripting and automated parsing, use the JSON format:

```bash
ceph health detail --format json-pretty
```

Sample JSON output:

```json
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
        { "message": "osd.4 (root=default,host=node2) is down" },
        { "message": "osd.7 (root=default,host=node3) is down" }
      ]
    }
  }
}
```

## Filtering for Specific Check Codes

When you know which check code you are looking for, pipe through grep:

```bash
ceph health detail | grep -A5 "OSD_NEARFULL"
```

Or in JSON format, use `jq`:

```bash
ceph health detail --format json | jq '.checks.OSD_NEARFULL'
```

## Acting on Health Detail

After reading the detail output, cross-reference affected components:

```bash
# If OSDs are down
ceph osd stat
ceph osd tree

# If placement groups are degraded
ceph pg stat
ceph pg dump_stuck inactive,unclean,stale

# If monitors have clock skew
ceph time-sync-status
```

## Kubernetes-Specific Workflow

In Rook environments, after identifying affected components via health detail, you can look at the related pods:

```bash
# Find OSD pod for a specific OSD
kubectl -n rook-ceph get pods -l app=rook-ceph-osd | grep osd-4

# Check its logs
kubectl -n rook-ceph logs rook-ceph-osd-4-<pod-suffix> --tail=50
```

## Summary

`ceph health detail` provides structured health check codes, severity levels, and per-component details. Read the summary line first, then drill into each `[WRN]` or `[ERR]` block to identify affected components. Use `--format json` for scripting, and cross-reference with `ceph osd stat`, `ceph pg stat`, and pod logs in Rook environments to diagnose the root cause.
