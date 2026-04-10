# How to Write a Ceph PG Status Monitoring Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, PG, Monitoring, Scripting, Python

Description: Build a Python script to monitor Ceph placement group states, detect stuck or degraded PGs, and alert when PG counts deviate from expected healthy states.

---

Placement Groups (PGs) are the fundamental unit of data distribution in Ceph. Monitoring their state is critical - stuck, degraded, or undersized PGs signal problems that will impact data availability and performance.

## Understanding PG States

PGs transition through many states. Key problematic states to watch:

- `degraded`: not enough replicas exist
- `undersized`: fewer copies than configured
- `inconsistent`: object checksums don't match
- `peering`: OSDs are negotiating state (should resolve quickly)
- `stuck`: has been in peering or degraded too long
- `backfill_toofull`: OSD is too full to accept backfill

## Monitoring Script

```python
#!/usr/bin/env python3
"""Monitor Ceph PG states and alert on problems."""

import json
import subprocess
import sys
import os
from collections import defaultdict
from datetime import datetime

NAMESPACE = os.environ.get("CEPH_NAMESPACE", "rook-ceph")
TOOLS_DEPLOY = "deploy/rook-ceph-tools"
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")
MAX_DEGRADED = int(os.environ.get("MAX_DEGRADED_PGS", "0"))
MAX_STUCK = int(os.environ.get("MAX_STUCK_PGS", "0"))

CRITICAL_STATES = {
    "inconsistent", "incomplete", "repair", "failed_repair"
}
WARNING_STATES = {
    "degraded", "undersized", "recovering", "backfilling",
    "backfill_toofull", "peering", "stale"
}


def run_ceph(*args) -> dict:
    cmd = [
        "kubectl", "-n", NAMESPACE, "exec", TOOLS_DEPLOY,
        "--", "ceph", *args, "--format", "json"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"ceph command failed: {result.stderr}")
    return json.loads(result.stdout)


def get_pg_summary() -> dict:
    """Get PG state summary from pg stat."""
    return run_ceph("pg", "stat")


def get_pg_states() -> dict[str, int]:
    """Get count of PGs in each state from pg dump."""
    pg_dump = run_ceph("pg", "dump", "pgs_brief")
    state_counts: dict[str, int] = defaultdict(int)
    for pg in pg_dump.get("pg_stats", []):
        state = pg.get("state", "unknown")
        # PG state can be compound: active+clean+degraded
        for s in state.split("+"):
            state_counts[s] += 1
    return dict(state_counts)


def get_stuck_pgs() -> list[dict]:
    """Get PGs that are stuck."""
    result = run_ceph("pg", "dump_stuck")
    return result.get("stuck_pg_stats", [])


def analyze_pg_states(states: dict[str, int]) -> tuple[list[str], list[str]]:
    """Return (critical_alerts, warning_alerts)."""
    crits = []
    warns = []

    for state, count in states.items():
        if state in CRITICAL_STATES:
            crits.append(f"CRITICAL: {count} PG(s) in state '{state}'")
        elif state in WARNING_STATES:
            warns.append(f"WARNING: {count} PG(s) in state '{state}'")

    # Check degraded count against threshold
    degraded = states.get("degraded", 0)
    if degraded > MAX_DEGRADED:
        crits.append(
            f"CRITICAL: {degraded} degraded PG(s) exceeds threshold {MAX_DEGRADED}"
        )

    return crits, warns


def print_pg_state_table(states: dict[str, int]) -> None:
    """Print a table of PG states."""
    print(f"\n{'PG State':<25} {'Count':>8}")
    print("-" * 35)
    for state, count in sorted(states.items(), key=lambda x: -x[1]):
        marker = " [CRITICAL]" if state in CRITICAL_STATES else \
                 " [WARNING]" if state in WARNING_STATES else ""
        print(f"{state:<25} {count:>8}{marker}")


def send_slack_alert(messages: list[str]) -> None:
    """Send alert to Slack."""
    if not SLACK_WEBHOOK:
        return
    import urllib.request
    text = "\n".join(messages)
    payload = json.dumps({"text": f"*Ceph PG Alert*\n{text}"}).encode()
    req = urllib.request.Request(
        SLACK_WEBHOOK, data=payload,
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req, timeout=10)


def main():
    print(f"=== Ceph PG Monitor: {datetime.now().isoformat()} ===")

    try:
        pg_stat = get_pg_summary()
        total_pgs = pg_stat.get("num_pgs", 0)
        print(f"Total PGs: {total_pgs}")

        states = get_pg_states()
        print_pg_state_table(states)

        stuck = get_stuck_pgs()
        if stuck:
            print(f"\nStuck PGs: {len(stuck)}")
            for pg in stuck[:5]:
                print(f"  - {pg.get('pgid')}: {pg.get('state')}")

        crits, warns = analyze_pg_states(states)

        if len(stuck) > MAX_STUCK:
            crits.append(
                f"CRITICAL: {len(stuck)} stuck PG(s) exceeds threshold {MAX_STUCK}"
            )

        all_alerts = crits + warns + (
            [f"WARNING: {len(stuck)} PG(s) stuck"] if stuck else []
        )

        if crits:
            print("\nCRITICAL ALERTS:")
            for a in crits:
                print(f"  {a}")
        if warns:
            print("\nWARNINGS:")
            for a in warns:
                print(f"  {a}")

        if all_alerts:
            send_slack_alert(all_alerts)
            sys.exit(2 if crits else 1)
        else:
            print("\nAll PGs healthy.")
            sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
```

## Summary

This PG monitoring script classifies all PG states into critical and warning categories, tracks stuck PGs separately, and sends structured alerts to Slack. By running it every few minutes via a Kubernetes CronJob and integrating its exit codes with your alerting pipeline, you get reliable early warning of PG health issues before they escalate to data unavailability.
