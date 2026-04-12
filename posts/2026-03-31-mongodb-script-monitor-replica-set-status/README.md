# How to Write a Script to Monitor MongoDB Replica Set Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Replica Set, Monitoring, Operation

Description: Learn how to write a script to monitor MongoDB replica set status by checking member health, replication lag, and oplog window to detect failures and alert your team.

---

## Overview

A replica set monitoring script checks whether all members are healthy, measures replication lag between the primary and secondaries, and monitors the oplog window to ensure secondaries can catch up after a restart. Automate this and alert when any check fails.

## Key Metrics to Monitor

```text
1. Member state - PRIMARY, SECONDARY, or degraded (RECOVERING, DOWN, STARTUP)
2. Replication lag - seconds behind the primary
3. Oplog window - hours of operations buffered on the primary
4. Election count - unexpected elections may indicate instability
5. Last heartbeat - members not heard from recently
```

## Python Monitoring Script

```python
#!/usr/bin/env python3
import os
from pymongo import MongoClient
from datetime import datetime

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
LAG_THRESHOLD_SECS = 30
OPLOG_WINDOW_THRESHOLD_HOURS = 24
WEBHOOK_URL = os.environ.get("ALERT_WEBHOOK_URL")

client = MongoClient(MONGO_URI)

def check_replica_set():
    alerts = []

    try:
        status = client.admin.command("replSetGetStatus")
    except Exception as e:
        return [f"CRITICAL: Cannot get replica set status: {e}"]

    members = status.get("members", [])
    if not members:
        return ["CRITICAL: No replica set members found"]

    primary = next((m for m in members if m["stateStr"] == "PRIMARY"), None)
    if not primary:
        alerts.append("CRITICAL: No PRIMARY member found in replica set")

    for member in members:
        name = member.get("name", "unknown")
        state = member.get("stateStr", "UNKNOWN")
        health = member.get("health", 0)

        # Check member health
        if health != 1:
            alerts.append(f"CRITICAL: Member {name} is unhealthy (health={health})")

        # Check for degraded states
        if state not in ("PRIMARY", "SECONDARY", "ARBITER"):
            alerts.append(f"WARNING: Member {name} is in state {state}")

        # Check replication lag for secondaries
        if state == "SECONDARY" and primary:
            lag_secs = (primary["optimeDate"] - member["optimeDate"]).total_seconds()
            if lag_secs > LAG_THRESHOLD_SECS:
                alerts.append(f"WARNING: {name} replication lag is {lag_secs:.1f}s (threshold: {LAG_THRESHOLD_SECS}s)")

        # Check last heartbeat
        last_hb = member.get("lastHeartbeatRecv")
        if last_hb:
            secs_since_hb = (datetime.utcnow() - last_hb).total_seconds()
            if secs_since_hb > 30:
                alerts.append(f"WARNING: {name} last heartbeat was {secs_since_hb:.0f}s ago")

    return alerts

def check_oplog_window():
    try:
        oplog = client.local["oplog.rs"]
        first = oplog.find_one(sort=[("$natural", 1)])
        last = oplog.find_one(sort=[("$natural", -1)])
        if first and last:
            window_hours = (last["ts"].time - first["ts"].time) / 3600
            if window_hours < OPLOG_WINDOW_THRESHOLD_HOURS:
                return f"WARNING: Oplog window is {window_hours:.1f}h (threshold: {OPLOG_WINDOW_THRESHOLD_HOURS}h)"
            return None
    except Exception as e:
        return f"ERROR checking oplog window: {e}"

def send_alert(message):
    if WEBHOOK_URL:
        import urllib.request
        import json
        payload = json.dumps({"text": f"MongoDB Alert: {message}"}).encode()
        req = urllib.request.Request(WEBHOOK_URL, data=payload,
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req)

if __name__ == "__main__":
    print(f"=== Replica Set Monitor: {datetime.utcnow().isoformat()} ===")

    alerts = check_replica_set()
    oplog_alert = check_oplog_window()
    if oplog_alert:
        alerts.append(oplog_alert)

    if alerts:
        print(f"ALERTS ({len(alerts)}):")
        for alert in alerts:
            print(f"  {alert}")
            send_alert(alert)
    else:
        print("OK: All replica set members healthy")
```

## mongosh Quick Status Check

```javascript
const status = rs.status();
status.members.forEach(m => {
  const lag = m.optimeDate ? (new Date() - m.optimeDate) / 1000 : null;
  print(`${m.name} | ${m.stateStr} | lag: ${lag ? lag.toFixed(0) + 's' : 'N/A'} | health: ${m.health}`);
});
```

## Checking Oplog Size and Window

```javascript
use local
const first = db["oplog.rs"].find().sort({ $natural: 1 }).limit(1).next();
const last = db["oplog.rs"].find().sort({ $natural: -1 }).limit(1).next();
const windowHours = (last.ts.t - first.ts.t) / 3600;
print("Oplog window: " + windowHours.toFixed(1) + " hours");
print("Oplog size: " + db["oplog.rs"].stats().maxSize / 1024 / 1024 / 1024 + " GB");
```

## Scheduling

```bash
# Check replica set every 2 minutes
*/2 * * * * /usr/local/bin/python3 /opt/scripts/rs_monitor.py >> /var/log/mongodb-rs.log 2>&1
```

## Best Practices

- Alert immediately on `CRITICAL` issues (no primary, unhealthy member) and investigate `WARNING` issues (lag, short oplog window) proactively.
- Size your oplog to hold at least 24-48 hours of writes so secondaries can recover from brief outages without needing a full resync.
- Monitor election count via `rs.status().term` over time - a rapidly increasing term number indicates repeated elections and instability.

## Summary

A replica set monitoring script checks member state, replication lag, last heartbeat, and oplog window using the `replSetGetStatus` command. Run it every 2 minutes via cron and send webhook alerts to your incident management platform when any check fails.
