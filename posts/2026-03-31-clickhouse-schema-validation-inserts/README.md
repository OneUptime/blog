# How to Implement Schema Validation Before ClickHouse Inserts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Validation, Data Quality, Insert, Python

Description: Learn how to validate data schema before inserting into ClickHouse to prevent bad data from corrupting your analytics tables.

---

ClickHouse does not enforce application-level constraints like foreign keys or NOT NULL beyond column defaults. Validating schema before inserts prevents malformed data from silently corrupting analytics.

## Why Schema Validation Matters

- ClickHouse accepts empty strings for String columns even when a value is expected
- Numeric overflow is silently wrapped (not clamped) for integer types
- Missing JSON keys result in default values, not errors

## Validation with Pydantic (Python)

```python
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional

class EventRow(BaseModel):
    ts: datetime
    event_type: str
    user_id: int
    session_id: str
    page_url: str
    value: Optional[float] = None

    @field_validator('event_type')
    @classmethod
    def valid_event_type(cls, v):
        allowed = {'click', 'view', 'purchase', 'signup'}
        if v not in allowed:
            raise ValueError(f'Invalid event_type: {v}')
        return v

    @field_validator('user_id')
    @classmethod
    def positive_user_id(cls, v):
        if v <= 0:
            raise ValueError('user_id must be positive')
        return v
```

Validate before insert:

```python
from clickhouse_driver import Client
import json

client = Client('clickhouse')

def validated_insert(raw_rows: list[dict]):
    valid, rejected = [], []
    for row in raw_rows:
        try:
            valid.append(EventRow(**row).model_dump())
        except Exception as e:
            rejected.append({'row': row, 'error': str(e)})

    if valid:
        client.execute('INSERT INTO events VALUES', valid)

    if rejected:
        with open('/var/log/rejected_events.jsonl', 'a') as f:
            for r in rejected:
                f.write(json.dumps(r) + '\n')

    return len(valid), len(rejected)
```

## Server-Side Type Coercion Check

ClickHouse's `input_format_null_as_default` setting silently fills nulls. Disable it to detect missing required fields:

```sql
SET input_format_null_as_default = 0;
```

## Rejecting Unknown Fields on Insert

Insert with `input_format_skip_unknown_fields = 0` to fail on unexpected columns:

```bash
curl -X POST 'http://clickhouse:8123/?input_format_skip_unknown_fields=0&query=INSERT+INTO+events+FORMAT+JSONEachRow' \
  -d '{"ts":"2026-03-31 10:00:00","unknown_field":"oops"}'
```

## Dead-Letter Table for Rejected Rows

```sql
CREATE TABLE events_rejected (
    received_at DateTime DEFAULT now(),
    raw_data String,
    error_message String
) ENGINE = MergeTree() ORDER BY received_at
TTL received_at + INTERVAL 7 DAY;
```

Write rejected rows here for later inspection and reprocessing.

## Summary

Validate ClickHouse inserts at the application layer using Pydantic or equivalent schema models. Write rejected rows to a dead-letter table for inspection. Disable `input_format_null_as_default` and `input_format_skip_unknown_fields` at the server level to catch schema mismatches early.
