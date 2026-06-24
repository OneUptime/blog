# How to Build an Audit Log with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Audit Log, Compliance, Event Store

Description: Learn how to build a tamper-evident audit log using Redis Streams, with structured event schema, retention policies, and efficient querying by entity or time range.

---

An audit log records every significant action in your system with who did it, what they changed, and when. Redis Streams are well-suited for audit logs because entries are append-only, have built-in timestamps, and can be queried by time range.

## Audit Event Schema

Design a consistent event structure for all audit entries:

```python
import redis
import json
import time
import uuid

r = redis.Redis(decode_responses=True)

AUDIT_STREAM = 'audit:events'

def log_audit_event(actor_id, actor_type, action, resource_type, resource_id,
                    before=None, after=None, metadata=None):
    event = {
        'event_id': str(uuid.uuid4()),
        'actor_id': str(actor_id),
        'actor_type': actor_type,       # user, service, system
        'action': action,               # create, update, delete, view
        'resource_type': resource_type, # order, user, payment
        'resource_id': str(resource_id),
        'timestamp': int(time.time() * 1000),
        'before': json.dumps(before) if before else '',
        'after': json.dumps(after) if after else '',
        'metadata': json.dumps(metadata or {})
    }

    entry_id = r.xadd(AUDIT_STREAM, event)
    return entry_id
```

## Recording Audit Events

Call the audit logger at each significant action:

```python
# User changes their email
def update_user_email(user_id, new_email, changed_by):
    old_email = db.get_user_email(user_id)
    db.update_user(user_id, email=new_email)

    log_audit_event(
        actor_id=changed_by,
        actor_type='user',
        action='update',
        resource_type='user',
        resource_id=user_id,
        before={'email': old_email},
        after={'email': new_email}
    )

# Admin deletes an order
def delete_order(order_id, admin_id):
    order = db.get_order(order_id)
    db.delete_order(order_id)

    log_audit_event(
        actor_id=admin_id,
        actor_type='admin',
        action='delete',
        resource_type='order',
        resource_id=order_id,
        before=order.to_dict(),
        metadata={'reason': 'fraud', 'ticket': 'SUPPORT-1234'}
    )
```

## Querying Audit Events by Time Range

Redis Stream IDs encode millisecond timestamps, enabling efficient time-range queries:

```python
def get_audit_events(start_time=None, end_time=None, max_count=100):
    """Query audit log by time range"""
    start_id = '-'
    end_id = '+'

    if start_time:
        start_ms = int(start_time.timestamp() * 1000)
        start_id = f'{start_ms}-0'

    if end_time:
        end_ms = int(end_time.timestamp() * 1000)
        end_id = f'{end_ms}-9999999'

    entries = r.xrange(AUDIT_STREAM, start_id, end_id, count=max_count)

    return [
        {'id': entry_id, **fields}
        for entry_id, fields in entries
    ]
```

## Querying by Resource

For per-resource audit trails, maintain secondary index streams:

```python
def log_with_index(actor_id, action, resource_type, resource_id, **kwargs):
    # Write to main audit stream
    main_id = log_audit_event(actor_id, 'user', action, resource_type, resource_id, **kwargs)

    # Write reference to per-resource stream
    resource_stream = f'audit:{resource_type}:{resource_id}'
    r.xadd(resource_stream, {'audit_id': main_id, 'action': action}, maxlen=1000)
    return main_id

def get_resource_history(resource_type, resource_id):
    """Get all audit entries for a specific resource"""
    resource_stream = f'audit:{resource_type}:{resource_id}'
    refs = r.xrange(resource_stream, '-', '+')
    return [{'stream_id': sid, **fields} for sid, fields in refs]
```

## Retention Policy

Comply with audit requirements by setting appropriate retention:

```python
import schedule

def apply_audit_retention():
    # Keep 90 days of audit logs
    cutoff_ms = int((time.time() - 90 * 86400) * 1000)
    cutoff_id = f'{cutoff_ms}-0'

    trimmed = r.xtrim(AUDIT_STREAM, minid=cutoff_id, approximate=True)
    print(f"Trimmed {trimmed} old audit entries")

schedule.every().day.at('02:00').do(apply_audit_retention)
```

## Archiving to Cold Storage

Before trimming, archive old entries to object storage:

```bash
# Export entries older than 90 days to a text file
redis-cli XRANGE audit:events - 1680000000000-0 > audit_archive_2024_q1.txt
```

## Summary

Build audit logs with Redis Streams by appending structured events with `XADD`, querying them by time range using timestamp-encoded stream IDs, and maintaining per-resource index streams for efficient resource history lookups. Combine a 90-day retention policy with periodic archival to cold storage to meet compliance requirements without unbounded stream growth.
