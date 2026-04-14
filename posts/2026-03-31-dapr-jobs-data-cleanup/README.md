# How to Use Dapr Jobs for Data Cleanup Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Data Cleanup, Scheduling, Microservice

Description: Learn how to automate data cleanup tasks using Dapr Jobs API, scheduling deletion of expired records, temp files, and stale data in microservices.

---

Data accumulates quickly in production systems - expired sessions, old log entries, temporary files, and soft-deleted records. Dapr Jobs provides a reliable way to schedule regular cleanup tasks that run on a defined schedule without manual intervention.

## Common Data Cleanup Scenarios

- Deleting expired user sessions from a database
- Purging soft-deleted records older than a retention period
- Cleaning up temporary upload files
- Archiving or deleting old log entries
- Removing expired cache entries from persistent storage

## Scheduling Cleanup Jobs

Define multiple cleanup jobs with appropriate schedules:

```bash
# Clean expired sessions every hour
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/cleanup-expired-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 1h",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"target\": \"sessions\", \"olderThan\": \"24h\"}"
    }
  }'

# Archive old audit logs every Sunday at midnight
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/archive-audit-logs \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 0 * * 0",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"target\": \"audit_logs\", \"olderThan\": \"2160h\"}"
    }
  }'
```

## Implementing the Cleanup Handler

```python
from flask import Flask, request, jsonify
import psycopg2
import json
import logging
from datetime import datetime, timedelta

app = Flask(__name__)
logger = logging.getLogger(__name__)

DB_CONN = "postgresql://user:password@localhost/mydb"

@app.route('/job/cleanup-expired-sessions', methods=['POST'])
def cleanup_sessions():
    payload = request.get_json()
    params = json.loads(payload.get('data', {}).get('value', '{}'))
    older_than = params.get('olderThan', '24h')

    cutoff = calculate_cutoff(older_than)
    deleted = delete_expired_sessions(cutoff)

    logger.info(f"Deleted {deleted} expired sessions older than {cutoff}")
    return jsonify({"deleted": deleted}), 200

@app.route('/job/archive-audit-logs', methods=['POST'])
def archive_audit_logs():
    payload = request.get_json()
    params = json.loads(payload.get('data', {}).get('value', '{}'))
    older_than = params.get('olderThan', '2160h')

    cutoff = calculate_cutoff(older_than)
    archived = archive_old_logs(cutoff)

    logger.info(f"Archived {archived} audit log entries older than {cutoff}")
    return jsonify({"archived": archived}), 200

def parse_duration_hours(duration_str: str) -> int:
    """Parse a duration string like '24h' or '2160h' into hours."""
    if duration_str.endswith('h'):
        return int(duration_str[:-1])
    raise ValueError(f"Unsupported duration format: {duration_str}")

def calculate_cutoff(duration_str: str) -> datetime:
    hours = parse_duration_hours(duration_str)
    return datetime.utcnow() - timedelta(hours=hours)

def delete_expired_sessions(cutoff: datetime) -> int:
    with psycopg2.connect(DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM sessions WHERE expires_at < %s",
                (cutoff,)
            )
            return cur.rowcount

def count_expired_sessions(cutoff: datetime) -> int:
    with psycopg2.connect(DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM sessions WHERE expires_at < %s",
                (cutoff,)
            )
            return cur.fetchone()[0]

def archive_old_logs(cutoff: datetime) -> int:
    with psycopg2.connect(DB_CONN) as conn:
        with conn.cursor() as cur:
            # Move to archive table
            cur.execute("""
                INSERT INTO audit_logs_archive
                SELECT * FROM audit_logs WHERE created_at < %s
            """, (cutoff,))
            archived = cur.rowcount

            cur.execute(
                "DELETE FROM audit_logs WHERE created_at < %s",
                (cutoff,)
            )
            return archived

if __name__ == '__main__':
    app.run(port=6001)
```

## Safe Cleanup with Dry-Run Mode

Add a dry-run flag to preview what would be deleted:

```python
@app.route('/job/cleanup-expired-sessions', methods=['POST'])
def cleanup_sessions():
    payload = request.get_json()
    params = json.loads(payload.get('data', {}).get('value', '{}'))
    dry_run = params.get('dryRun', False)
    cutoff = calculate_cutoff(params.get('olderThan', '24h'))

    if dry_run:
        count = count_expired_sessions(cutoff)
        logger.info(f"DRY RUN: Would delete {count} sessions")
        return jsonify({"wouldDelete": count, "dryRun": True}), 200

    deleted = delete_expired_sessions(cutoff)
    return jsonify({"deleted": deleted}), 200
```

## Tracking Cleanup Metrics

Store cleanup results in Dapr state for monitoring:

```python
import requests

def record_cleanup_result(job_name: str, result: dict):
    requests.post(
        "http://localhost:3500/v1.0/state/statestore",
        json=[{
            "key": f"cleanup-{job_name}-last",
            "value": {
                "timestamp": datetime.utcnow().isoformat(),
                **result
            }
        }]
    )
```

## Summary

Dapr Jobs makes it straightforward to schedule regular data cleanup tasks that keep your databases and storage systems healthy. The combination of configurable schedules, parameterized job data, and safe dry-run patterns ensures cleanup runs reliably without risking accidental data loss.
