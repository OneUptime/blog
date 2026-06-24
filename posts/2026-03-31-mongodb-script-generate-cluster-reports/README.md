# How to Write a Script to Generate MongoDB Cluster Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Reporting, Cluster, Operation

Description: Learn how to write a Python script that generates a comprehensive MongoDB cluster report covering storage, replication, connections, index usage, and top collections.

---

## Overview

A weekly cluster report gives engineering and operations teams a snapshot of MongoDB health, growth trends, and potential issues without manually digging through metrics. This script collects server status, replication state, storage stats, and index usage into a structured report.

## Report Sections

```text
1. Cluster overview (version, topology, uptime)
2. Storage usage by database
3. Connection pool usage
4. Replication status and lag
5. Operations counters
```

## Python Cluster Report Script

```python
#!/usr/bin/env python3
import os
from datetime import datetime
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)

def bytes_to_human(b):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} PB"

def generate_report():
    report = {"generatedAt": datetime.utcnow().isoformat(), "sections": {}}

    # 1. Cluster overview
    server_info = client.admin.command("serverStatus")
    build_info = client.admin.command("buildInfo")
    uptime_hours = server_info["uptimeMillis"] / 3600000

    report["sections"]["overview"] = {
        "version": build_info["version"],
        "uptime_hours": round(uptime_hours, 1),
        "host": server_info.get("host", "N/A"),
        "process": server_info.get("process", "N/A"),
    }

    # 2. Storage usage by database
    db_stats = []
    for db_name in client.list_database_names():
        if db_name in ("admin", "config", "local"):
            continue
        stats = client[db_name].command("dbStats", scale=1)
        db_stats.append({
            "database": db_name,
            "collections": stats.get("collections", 0),
            "data_size": bytes_to_human(stats.get("dataSize", 0)),
            "storage_size": bytes_to_human(stats.get("storageSize", 0)),
            "index_size": bytes_to_human(stats.get("indexSize", 0)),
            "documents": stats.get("objects", 0),
        })
    db_stats.sort(key=lambda x: x["documents"], reverse=True)
    report["sections"]["databases"] = db_stats

    # 3. Connection usage
    connections = server_info["connections"]
    total = connections["current"] + connections["available"]
    report["sections"]["connections"] = {
        "current": connections["current"],
        "available": connections["available"],
        "total_allocated": total,
        "usage_pct": round((connections["current"] / total) * 100, 1)
    }

    # 4. Replication status
    try:
        rs_status = client.admin.command("replSetGetStatus")
        members_summary = []
        primary = next((m for m in rs_status["members"] if m["stateStr"] == "PRIMARY"), None)
        for m in rs_status["members"]:
            lag = None
            if m["stateStr"] == "SECONDARY" and primary:
                lag = round((primary["optimeDate"] - m["optimeDate"]).total_seconds(), 1)
            members_summary.append({
                "name": m["name"],
                "state": m["stateStr"],
                "health": m["health"],
                "lag_secs": lag
            })
        report["sections"]["replication"] = {"members": members_summary}
    except Exception:
        report["sections"]["replication"] = {"status": "not a replica set"}

    # 5. Operations counters
    ops = server_info.get("opcounters", {})
    report["sections"]["operations"] = {k: v for k, v in ops.items()}

    return report

def print_report(report):
    print("=" * 60)
    print(f"MongoDB Cluster Report")
    print(f"Generated: {report['generatedAt']}")
    print("=" * 60)

    ov = report["sections"]["overview"]
    print(f"\nOVERVIEW")
    print(f"  Version: {ov['version']} | Host: {ov['host']}")
    print(f"  Uptime: {ov['uptime_hours']}h")

    print(f"\nDATABASES")
    for db in report["sections"]["databases"]:
        print(f"  {db['database']}: {db['documents']} docs | "
              f"data={db['data_size']} | index={db['index_size']}")

    conn = report["sections"]["connections"]
    print(f"\nCONNECTIONS")
    print(f"  {conn['current']}/{conn['total_allocated']} ({conn['usage_pct']}%)")

    repl = report["sections"]["replication"]
    if "members" in repl:
        print(f"\nREPLICATION")
        for m in repl["members"]:
            lag_str = f" | lag={m['lag_secs']}s" if m["lag_secs"] is not None else ""
            print(f"  {m['name']}: {m['state']}{lag_str}")

    ops = report["sections"]["operations"]
    print(f"\nOPERATIONS (cumulative)")
    for op, count in ops.items():
        print(f"  {op}: {count:,}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    report = generate_report()
    print_report(report)

    # Optionally save to file
    import json
    output_path = f"/var/log/mongodb/cluster_report_{datetime.utcnow().strftime('%Y%m%d')}.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\nReport saved to: {output_path}")
```

## Scheduling Weekly Reports

```bash
# Generate cluster report every Monday at 8 AM
0 8 * * 1 /usr/local/bin/python3 /opt/scripts/cluster_report.py >> /var/log/mongodb/cluster_report.log 2>&1
```

## Emailing the Report

```python
import smtplib
from email.mime.text import MIMEText

def email_report(report_text, to_email):
    msg = MIMEText(report_text)
    msg["Subject"] = f"MongoDB Cluster Report - {datetime.utcnow().date()}"
    msg["From"] = "alerts@example.com"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.example.com", 587) as server:
        server.starttls()
        server.login("user", os.environ["SMTP_PASSWORD"])
        server.send_message(msg)
```

## Best Practices

- Save reports as JSON files alongside the text output so you can compare metrics over time.
- Track `opcounters` values across weekly reports to spot gradual query volume growth before it becomes a capacity problem.
- Include the WiredTiger cache usage percentage in your report - when cache usage exceeds 80%, performance degrades as data is evicted.

## Summary

A MongoDB cluster report script collects server status, database sizes, connection usage, and replication state into a structured weekly summary. Save reports as JSON for trend analysis and schedule them via cron to email the engineering team every Monday morning.
