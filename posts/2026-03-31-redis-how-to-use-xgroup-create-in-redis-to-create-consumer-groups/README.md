# How to Use XGROUP CREATE in Redis to Create Consumer Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, XGROUP, Consumer Group, Messaging

Description: Learn how to use XGROUP CREATE in Redis to create consumer groups on streams, configuring the starting position and auto-creating streams.

---

## What Is XGROUP CREATE

`XGROUP CREATE` creates a consumer group on an existing Redis stream. A consumer group tracks which messages have been delivered to consumers and maintains a pending entries list (PEL) for reliable message processing. Multiple consumer groups can exist on the same stream, each maintaining their own position independently.

## Syntax

```text
XGROUP CREATE key groupname id [MKSTREAM] [ENTRIESREAD entries-read]
```

- `key` - the stream key
- `groupname` - the consumer group name
- `id` - starting position for the group:
  - `$` - only new messages added after group creation
  - `0` - all existing messages from the start of the stream
  - Specific ID - messages after that ID
- `MKSTREAM` - create the stream if it does not exist (Redis 5.0+)
- `ENTRIESREAD` - override the entries-read counter for lag calculation (Redis 7.0+)

Returns `OK` on success.

## Basic Usage

### Create Group for New Messages Only

```bash
redis-cli XADD orders '*' product "laptop"
redis-cli XADD orders '*' product "mouse"

# Group will only see messages added AFTER this point
redis-cli XGROUP CREATE orders new_orders_group $
```

```text
OK
```

### Create Group to Process All Existing Messages

```bash
# Group starts from the beginning - will see all existing messages
redis-cli XGROUP CREATE orders backfill_group 0
```

### Create with MKSTREAM (Auto-Create Stream)

```bash
# Creates both the stream and the group if stream doesn't exist
redis-cli XGROUP CREATE new_stream my_group $ MKSTREAM
```

### Create from a Specific ID

```bash
# Only process messages after a specific ID
redis-cli XGROUP CREATE orders partial_group 1743400001500-0
```

## Error Handling

```bash
# Error if stream doesn't exist and MKSTREAM is not used
redis-cli XGROUP CREATE nonexistent_stream mygroup $
```

```text
(error) ERR The XGROUP subcommand requires the key to exist. You can use XGROUP CREATE with the MKSTREAM option to create an empty stream automatically.
```

```bash
# Error if group already exists
redis-cli XGROUP CREATE orders new_orders_group $
redis-cli XGROUP CREATE orders new_orders_group $
```

```text
(error) BUSYGROUP Consumer Group 'new_orders_group' already exists
```

## Practical Examples

### Safe Group Creation (Idempotent)

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def ensure_consumer_group(stream, group, start_id='$'):
    """Create consumer group if it doesn't exist."""
    try:
        r.xgroup_create(stream, group, start_id, mkstream=True)
        print(f"Created group '{group}' on stream '{stream}'")
    except redis.exceptions.ResponseError as e:
        if 'BUSYGROUP' in str(e):
            print(f"Group '{group}' already exists on '{stream}'")
        else:
            raise

ensure_consumer_group('orders', 'processors')
ensure_consumer_group('orders', 'processors')  # No error
```

### Multiple Groups on One Stream

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

STREAM = 'events'
GROUPS = {
    'analytics': '0',        # Process all historical events
    'notifications': '$',    # Only process new events
    'audit_log': '0',        # Process all events for compliance
}

def setup_stream_groups():
    for group_name, start_id in GROUPS.items():
        try:
            r.xgroup_create(STREAM, group_name, start_id, mkstream=True)
            print(f"Created group: {group_name} (starting from {start_id})")
        except redis.exceptions.ResponseError as e:
            if 'BUSYGROUP' in str(e):
                print(f"Group {group_name} already exists")

setup_stream_groups()
```

### Application Startup with Group Bootstrap

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

STREAM_CONFIGS = [
    {'stream': 'orders', 'groups': ['order_processor', 'order_analytics', 'invoice_generator']},
    {'stream': 'payments', 'groups': ['payment_processor', 'fraud_detector']},
    {'stream': 'notifications', 'groups': ['email_sender', 'sms_sender', 'push_sender']},
]

def bootstrap_streams():
    for config in STREAM_CONFIGS:
        stream = config['stream']
        for group in config['groups']:
            try:
                r.xgroup_create(stream, group, '$', mkstream=True)
            except redis.exceptions.ResponseError as e:
                if 'BUSYGROUP' not in str(e):
                    raise
    print("All stream groups ready")

bootstrap_streams()
```

### Group with Historical Replay

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load test data
r.xadd('audit:events', {'action': 'login', 'user': 'alice'})
r.xadd('audit:events', {'action': 'purchase', 'user': 'alice'})
r.xadd('audit:events', {'action': 'login', 'user': 'bob'})

def create_replay_group(stream, group_name):
    """Create a group that replays all historical messages."""
    try:
        r.xgroup_create(stream, group_name, '0')
        print(f"Created replay group '{group_name}' for full history")
    except redis.exceptions.ResponseError as e:
        if 'BUSYGROUP' in str(e):
            # Reset position to replay from start
            r.xgroup_setid(stream, group_name, '0')
            print(f"Reset group '{group_name}' to replay from start")

create_replay_group('audit:events', 'compliance_audit')

# Consumer reads all historical messages
messages = r.xreadgroup('compliance_audit', 'auditor-1',
                         streams={'audit:events': '>'},
                         count=100)
if messages:
    for _, entries in messages:
        for msg_id, data in entries:
            print(f"Audit: {msg_id} - {data}")
            r.xack('audit:events', 'compliance_audit', msg_id)
```

## Summary

`XGROUP CREATE` establishes a consumer group on a Redis stream with a configurable starting position: `$` for new messages only, `0` for full history replay, or a specific ID to start from a known point. The `MKSTREAM` option enables atomic stream and group creation. Multiple independent groups on the same stream allow different services to process the same events at their own pace without interference.
