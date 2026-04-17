# How to Use ClickHouse with FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, FastAPI, Python, Database, Analytics, API

Description: Learn how to integrate ClickHouse with FastAPI using clickhouse-connect, build analytics endpoints, handle async queries, and serve high-throughput read workloads.

---

FastAPI is the most popular modern Python web framework for building APIs. ClickHouse is the fastest analytical database for large-scale read workloads. Together they form a powerful stack for building analytics APIs that can serve millions of rows per second. This guide walks through the complete integration from installation to production patterns.

## Why ClickHouse with FastAPI

FastAPI's async-first design pairs well with ClickHouse's read-heavy workload. Typical use cases include:

- Dashboards that query billions of event rows in milliseconds
- Analytics APIs that aggregate user behavior data
- Log search and filtering endpoints
- Time-series metrics APIs

## Installation

Install the official ClickHouse Python client and FastAPI dependencies:

```bash
pip install clickhouse-connect fastapi uvicorn pydantic
```

`clickhouse-connect` is the official Python client maintained by ClickHouse Inc. It supports both synchronous and async usage, HTTP and native protocols, and query streaming.

## Project Structure

```text
app/
  main.py
  database.py
  models.py
  routers/
    events.py
    analytics.py
requirements.txt
```

## Database Connection

Create a module to manage the ClickHouse client lifecycle:

```python
# app/database.py
import clickhouse_connect
from clickhouse_connect.driver.client import Client
from functools import lru_cache

@lru_cache(maxsize=1)
def get_settings():
    return {
        "host": "localhost",
        "port": 8123,
        "username": "default",
        "password": "",
        "database": "analytics",
        "connect_timeout": 10,
        "send_receive_timeout": 30,
    }

def get_client() -> Client:
    settings = get_settings()
    return clickhouse_connect.get_client(**settings)

# Module-level client for reuse across requests
_client: Client | None = None

def client() -> Client:
    global _client
    if _client is None:
        _client = get_client()
    return _client
```

## Table Schema

Create the events table in ClickHouse before writing any FastAPI code:

```sql
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.events
(
    event_id    UUID        DEFAULT generateUUIDv4(),
    user_id     UInt64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    properties  String,
    ts          DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts)
TTL ts + INTERVAL 1 YEAR;
```

## Pydantic Models

```python
# app/models.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EventIn(BaseModel):
    user_id: int
    session_id: str
    event_type: str
    page: str
    properties: dict = {}

class EventOut(BaseModel):
    event_id: str
    user_id: int
    session_id: str
    event_type: str
    page: str
    ts: datetime

class AggregateResult(BaseModel):
    event_type: str
    count: int
    unique_users: int

class TimeSeriesPoint(BaseModel):
    bucket: datetime
    count: int
```

## Events Router

```python
# app/routers/events.py
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta, timezone
from typing import List
from app.models import EventIn, EventOut, AggregateResult
from app.database import client

router = APIRouter(prefix="/events", tags=["events"])

@router.post("/", status_code=201)
def ingest_event(event: EventIn):
    ch = client()
    import json
    ch.insert(
        "analytics.events",
        [[
            event.user_id,
            event.session_id,
            event.event_type,
            event.page,
            json.dumps(event.properties),
            datetime.now(timezone.utc),
        ]],
        column_names=["user_id", "session_id", "event_type", "page", "properties", "ts"],
    )
    return {"status": "accepted"}

@router.post("/batch", status_code=201)
def ingest_batch(events: List[EventIn]):
    ch = client()
    import json
    rows = [
        [
            e.user_id,
            e.session_id,
            e.event_type,
            e.page,
            json.dumps(e.properties),
            datetime.now(timezone.utc),
        ]
        for e in events
    ]
    ch.insert(
        "analytics.events",
        rows,
        column_names=["user_id", "session_id", "event_type", "page", "properties", "ts"],
    )
    return {"status": "accepted", "count": len(rows)}

@router.get("/", response_model=List[EventOut])
def list_events(
    event_type: str | None = None,
    user_id: int | None = None,
    limit: int = Query(default=100, le=1000),
):
    ch = client()
    conditions = ["1=1"]
    params: dict = {}

    if event_type:
        conditions.append("event_type = {event_type:String}")
        params["event_type"] = event_type

    if user_id:
        conditions.append("user_id = {user_id:UInt64}")
        params["user_id"] = user_id

    where = " AND ".join(conditions)
    query = f"""
        SELECT event_id, user_id, session_id, event_type, page, ts
        FROM analytics.events
        WHERE {where}
        ORDER BY ts DESC
        LIMIT {{limit:UInt32}}
    """
    params["limit"] = limit

    result = ch.query(query, parameters=params)
    return [
        EventOut(
            event_id=str(row[0]),
            user_id=row[1],
            session_id=row[2],
            event_type=row[3],
            page=row[4],
            ts=row[5],
        )
        for row in result.result_rows
    ]
```

## Analytics Router

```python
# app/routers/analytics.py
from fastapi import APIRouter, Query
from datetime import datetime, timedelta, timezone
from typing import List
from app.models import AggregateResult, TimeSeriesPoint
from app.database import client

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary", response_model=List[AggregateResult])
def event_summary(
    since: datetime = Query(default=None),
    until: datetime = Query(default=None),
):
    ch = client()
    since = since or (datetime.now(timezone.utc) - timedelta(days=7))
    until = until or datetime.now(timezone.utc)

    result = ch.query(
        """
        SELECT
            event_type,
            count()          AS count,
            uniq(user_id)    AS unique_users
        FROM analytics.events
        WHERE ts BETWEEN {since:DateTime} AND {until:DateTime}
        GROUP BY event_type
        ORDER BY count DESC
        """,
        parameters={"since": since, "until": until},
    )
    return [
        AggregateResult(event_type=row[0], count=row[1], unique_users=row[2])
        for row in result.result_rows
    ]

@router.get("/timeseries", response_model=List[TimeSeriesPoint])
def timeseries(
    event_type: str,
    interval: str = Query(default="hour", pattern="^(minute|hour|day)$"),
    since: datetime = Query(default=None),
):
    ch = client()
    since = since or (datetime.now(timezone.utc) - timedelta(days=1))
    trunc_fn = {"minute": "toStartOfMinute", "hour": "toStartOfHour", "day": "toStartOfDay"}[interval]

    result = ch.query(
        f"""
        SELECT
            {trunc_fn}(ts) AS bucket,
            count()        AS count
        FROM analytics.events
        WHERE event_type = {{event_type:String}}
          AND ts >= {{since:DateTime}}
        GROUP BY bucket
        ORDER BY bucket
        """,
        parameters={"event_type": event_type, "since": since},
    )
    return [TimeSeriesPoint(bucket=row[0], count=row[1]) for row in result.result_rows]

@router.get("/funnel")
def funnel(steps: List[str] = Query(...)):
    ch = client()
    since = datetime.now(timezone.utc) - timedelta(days=30)

    result = ch.query(
        f"""
        SELECT
            {", ".join(f"countIf(step_{i}) AS step_{i}_count" for i in range(len(steps)))}
        FROM (
            SELECT
                user_id,
                {", ".join(f"has(groupArray(event_type), {{step_{i}:String}}) AS step_{i}" for i in range(len(steps)))}
            FROM analytics.events
            WHERE ts >= {{since:DateTime}}
            GROUP BY user_id
        )
        """,
        parameters={"since": since, **{f"step_{i}": s for i, s in enumerate(steps)}},
    )
    if result.result_rows:
        row = result.result_rows[0]
        return {f"step_{i}_{steps[i]}": row[i] for i in range(len(steps))}
    return {}
```

## Main Application

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import events, analytics
from app.database import client

@asynccontextmanager
async def lifespan(app: FastAPI):
    ch = client()
    result = ch.query("SELECT version()")
    print(f"Connected to ClickHouse {result.first_row[0]}")
    yield

app = FastAPI(title="ClickHouse Analytics API", version="1.0.0", lifespan=lifespan)

app.include_router(events.router)
app.include_router(analytics.router)

@app.get("/health")
def health():
    ch = client()
    result = ch.query("SELECT 1")
    return {"status": "ok", "clickhouse": result.first_row[0] == 1}
```

## Running the Application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Using Parameterized Queries

Always use parameterized queries to prevent SQL injection. The `clickhouse-connect` client supports named parameters with typed placeholders:

```python
result = ch.query(
    "SELECT * FROM events WHERE user_id = {uid:UInt64} AND event_type = {et:String}",
    parameters={"uid": 42, "et": "page_view"},
)
```

Supported type hints include `UInt8`, `UInt16`, `UInt32`, `UInt64`, `Int64`, `Float64`, `String`, `DateTime`, `Date`, and `Array(T)`.

## Streaming Large Result Sets

For endpoints that return millions of rows, use streaming to avoid loading everything into memory:

```python
@router.get("/export")
def export_events():
    from fastapi.responses import StreamingResponse
    import csv, io

    ch = client()
    stream = ch.query_row_block_stream(
        "SELECT event_id, user_id, event_type, ts FROM analytics.events LIMIT 10000000"
    )

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["event_id", "user_id", "event_type", "ts"])
        with stream:
            for block in stream:
                for row in block:
                    writer.writerow(row)
                    buf.seek(0)
                    yield buf.read()
                    buf.seek(0)
                    buf.truncate()

    return StreamingResponse(generate(), media_type="text/csv")
```

## Connection Pool Configuration

For production, configure connection pool settings to handle concurrent requests:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host="clickhouse.prod.internal",
    port=8443,
    username="api_user",
    password="secret",
    database="analytics",
    secure=True,
    verify=True,
    compress=True,
    settings={
        "max_execution_time": 30,
        "max_memory_usage": 4_000_000_000,
    },
)
```

## Summary

Integrating ClickHouse with FastAPI requires four components: a connection module using `clickhouse-connect`, a table schema optimized for your query patterns, parameterized query functions in your routers, and streaming support for large exports. The combination delivers sub-second analytics APIs over billions of rows without requiring a caching layer.
