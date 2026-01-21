# How to Connect to ClickHouse from Python, Node.js, and Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Python, Node.js, Go, Database, Client Libraries, Connection Pooling, Analytics

Description: A practical guide to connecting to ClickHouse from popular programming languages, covering client library setup, connection pooling, query patterns, and best practices for each language.

---

ClickHouse provides two protocols for client connections: HTTP (port 8123) and Native (port 9000). The native protocol is faster but requires language-specific drivers. The HTTP interface works with any HTTP client but adds some overhead. This guide covers the best client libraries for Python, Node.js, and Go, with working examples and production patterns.

## Python: clickhouse-connect

The `clickhouse-connect` library is the official Python driver maintained by ClickHouse. It uses the HTTP protocol with optimizations for data transfer.

### Installation

```bash
pip install clickhouse-connect
```

### Basic Connection

The simplest way to connect to ClickHouse from Python:

```python
import clickhouse_connect

# Create a client with basic connection parameters
client = clickhouse_connect.get_client(
    host='localhost',
    port=8123,
    username='default',
    password='your_password'
)

# Execute a query and get results
result = client.query('SELECT version()')
print(result.result_rows)
```

### Query Patterns

ClickHouse-connect supports several query methods depending on your needs:

```python
import clickhouse_connect
from datetime import datetime

client = clickhouse_connect.get_client(host='localhost')

# Simple query returning all results at once
result = client.query('SELECT * FROM events LIMIT 10')
for row in result.result_rows:
    print(row)

# Query with parameters to prevent SQL injection
result = client.query(
    'SELECT * FROM events WHERE event_type = {event_type:String} AND created_at > {since:DateTime}',
    parameters={
        'event_type': 'page_view',
        'since': datetime(2024, 1, 1)
    }
)

# Get results as a pandas DataFrame
df = client.query_df('SELECT event_type, count() as cnt FROM events GROUP BY event_type')
print(df.head())

# Stream large results to avoid memory issues
with client.query_rows_stream('SELECT * FROM events') as stream:
    for row in stream:
        process_row(row)
```

### Inserting Data

Insert data efficiently using batch operations:

```python
import clickhouse_connect
from datetime import datetime
import uuid

client = clickhouse_connect.get_client(host='localhost')

# Insert a single row
client.insert(
    'events',
    [[str(uuid.uuid4()), 'click', 12345, datetime.now()]],
    column_names=['event_id', 'event_type', 'user_id', 'created_at']
)

# Insert multiple rows efficiently
data = [
    [str(uuid.uuid4()), 'page_view', 100, datetime.now()],
    [str(uuid.uuid4()), 'click', 101, datetime.now()],
    [str(uuid.uuid4()), 'purchase', 102, datetime.now()],
]

client.insert(
    'events',
    data,
    column_names=['event_id', 'event_type', 'user_id', 'created_at']
)

# Insert from a pandas DataFrame
import pandas as pd

df = pd.DataFrame({
    'event_id': [str(uuid.uuid4()) for _ in range(1000)],
    'event_type': ['page_view'] * 1000,
    'user_id': range(1000),
    'created_at': [datetime.now()] * 1000
})

client.insert_df('events', df)
```

### Connection Pooling

For web applications, use connection pooling to reuse connections:

```python
import clickhouse_connect
from contextlib import contextmanager

# Create a client pool by keeping clients around
# clickhouse-connect handles connection pooling internally

class ClickHousePool:
    def __init__(self, host, port=8123, username='default', password=''):
        self.config = {
            'host': host,
            'port': port,
            'username': username,
            'password': password,
            'connect_timeout': 10,
            'send_receive_timeout': 300,
        }
        self._client = None

    def get_client(self):
        if self._client is None:
            self._client = clickhouse_connect.get_client(**self.config)
        return self._client

    def query(self, sql, parameters=None):
        return self.get_client().query(sql, parameters=parameters)

    def insert(self, table, data, column_names):
        return self.get_client().insert(table, data, column_names=column_names)

# Usage in Flask
from flask import Flask, g

app = Flask(__name__)
pool = ClickHousePool(host='localhost', password='your_password')

@app.route('/events')
def get_events():
    result = pool.query('SELECT * FROM events LIMIT 100')
    return {'events': result.result_rows}
```

### Async Support with asynch

For async applications, use the `asynch` library:

```bash
pip install asynch
```

```python
import asyncio
from asynch import connect

async def main():
    # Create async connection
    conn = await connect(
        host='localhost',
        port=9000,  # Native protocol
        database='default',
        user='default',
        password='your_password'
    )

    async with conn.cursor() as cursor:
        # Execute query
        await cursor.execute('SELECT * FROM events LIMIT 10')
        result = await cursor.fetchall()

        for row in result:
            print(row)

    # Connection automatically closed

asyncio.run(main())
```

## Node.js: @clickhouse/client

The official ClickHouse Node.js client supports both HTTP and streaming queries.

### Installation

```bash
npm install @clickhouse/client
```

### Basic Connection

Here's how to set up a basic connection in Node.js:

```javascript
const { createClient } = require('@clickhouse/client');

// Create a client instance
const client = createClient({
  host: 'http://localhost:8123',
  username: 'default',
  password: 'your_password',
  database: 'default',
});

// Execute a simple query
async function getVersion() {
  const result = await client.query({
    query: 'SELECT version()',
    format: 'JSONEachRow',
  });

  const data = await result.json();
  console.log(data);
}

getVersion();
```

### Query Patterns

The Node.js client supports various query formats:

```javascript
const { createClient } = require('@clickhouse/client');

const client = createClient({
  host: 'http://localhost:8123',
});

// Query with JSONEachRow format for easy parsing
async function queryEvents() {
  const result = await client.query({
    query: 'SELECT * FROM events LIMIT 10',
    format: 'JSONEachRow',
  });

  // Parse all results at once
  const events = await result.json();
  console.log(events);
}

// Query with parameters to prevent SQL injection
async function queryByType(eventType) {
  const result = await client.query({
    query: 'SELECT * FROM events WHERE event_type = {event_type:String}',
    query_params: {
      event_type: eventType,
    },
    format: 'JSONEachRow',
  });

  return result.json();
}

// Stream large results to handle memory efficiently
async function streamEvents() {
  const result = await client.query({
    query: 'SELECT * FROM events',
    format: 'JSONEachRow',
  });

  // Stream processes rows one at a time
  for await (const row of result.stream()) {
    const event = JSON.parse(row.text);
    processEvent(event);
  }
}
```

### Inserting Data

Insert data using the insert method:

```javascript
const { createClient } = require('@clickhouse/client');
const { v4: uuidv4 } = require('uuid');

const client = createClient({
  host: 'http://localhost:8123',
});

// Insert array of objects
async function insertEvents(events) {
  await client.insert({
    table: 'events',
    values: events,
    format: 'JSONEachRow',
  });
}

// Usage
const events = [
  {
    event_id: uuidv4(),
    event_type: 'page_view',
    user_id: 12345,
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  },
  {
    event_id: uuidv4(),
    event_type: 'click',
    user_id: 12346,
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  },
];

insertEvents(events);

// Stream large inserts
async function insertFromStream(dataStream) {
  await client.insert({
    table: 'events',
    values: dataStream,
    format: 'JSONEachRow',
  });
}
```

### Connection Management in Express

Here's a pattern for using ClickHouse in Express applications:

```javascript
const express = require('express');
const { createClient } = require('@clickhouse/client');

const app = express();

// Create a single client instance for the application
const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'default',
  request_timeout: 30000,
  max_open_connections: 10,
});

// Middleware to add client to request
app.use((req, res, next) => {
  req.clickhouse = clickhouse;
  next();
});

// Route using ClickHouse
app.get('/api/events', async (req, res) => {
  try {
    const { event_type, limit = 100 } = req.query;

    let query = 'SELECT * FROM events';
    const params = {};

    if (event_type) {
      query += ' WHERE event_type = {event_type:String}';
      params.event_type = event_type;
    }

    query += ' LIMIT {limit:UInt32}';
    params.limit = parseInt(limit);

    const result = await req.clickhouse.query({
      query,
      query_params: params,
      format: 'JSONEachRow',
    });

    const events = await result.json();
    res.json({ events });
  } catch (error) {
    console.error('Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await clickhouse.close();
  process.exit(0);
});

app.listen(3000);
```

## Go: clickhouse-go

The official Go driver provides both database/sql interface and a native API for better performance.

### Installation

```bash
go get github.com/ClickHouse/clickhouse-go/v2
```

### Basic Connection with Native API

The native API offers the best performance:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
    // Create connection with native protocol
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
        Auth: clickhouse.Auth{
            Database: "default",
            Username: "default",
            Password: "your_password",
        },
        Settings: clickhouse.Settings{
            "max_execution_time": 60,
        },
        DialTimeout:     10 * time.Second,
        MaxOpenConns:    10,
        MaxIdleConns:    5,
        ConnMaxLifetime: time.Hour,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Test connection
    ctx := context.Background()
    if err := conn.Ping(ctx); err != nil {
        log.Fatal(err)
    }

    // Execute query
    rows, err := conn.Query(ctx, "SELECT version()")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var version string
        if err := rows.Scan(&version); err != nil {
            log.Fatal(err)
        }
        fmt.Println("ClickHouse version:", version)
    }
}
```

### Query Patterns

Here's how to work with different query types in Go:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/ClickHouse/clickhouse-go/v2"
    "github.com/google/uuid"
)

// Event represents a row in the events table
type Event struct {
    EventID   string
    EventType string
    UserID    uint64
    CreatedAt time.Time
}

func main() {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
        Auth: clickhouse.Auth{
            Database: "default",
            Username: "default",
            Password: "",
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    ctx := context.Background()

    // Query with parameters
    events, err := queryEvents(ctx, conn, "page_view", 100)
    if err != nil {
        log.Fatal(err)
    }

    for _, event := range events {
        fmt.Printf("%+v\n", event)
    }
}

// queryEvents fetches events with parameterized query
func queryEvents(ctx context.Context, conn clickhouse.Conn, eventType string, limit int) ([]Event, error) {
    rows, err := conn.Query(ctx, `
        SELECT event_id, event_type, user_id, created_at
        FROM events
        WHERE event_type = $1
        LIMIT $2
    `, eventType, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var events []Event
    for rows.Next() {
        var e Event
        if err := rows.Scan(&e.EventID, &e.EventType, &e.UserID, &e.CreatedAt); err != nil {
            return nil, err
        }
        events = append(events, e)
    }

    return events, rows.Err()
}
```

### Batch Inserts

For high-throughput inserts, use batching:

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/ClickHouse/clickhouse-go/v2"
    "github.com/google/uuid"
)

func main() {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
        Auth: clickhouse.Auth{
            Database: "default",
            Username: "default",
            Password: "",
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    ctx := context.Background()

    // Insert events in batch
    if err := insertEventsBatch(ctx, conn, 10000); err != nil {
        log.Fatal(err)
    }
}

// insertEventsBatch inserts multiple events using batch API
func insertEventsBatch(ctx context.Context, conn clickhouse.Conn, count int) error {
    // Create a batch for efficient inserts
    batch, err := conn.PrepareBatch(ctx, "INSERT INTO events (event_id, event_type, user_id, created_at)")
    if err != nil {
        return err
    }

    // Add rows to the batch
    for i := 0; i < count; i++ {
        err := batch.Append(
            uuid.New().String(),
            "page_view",
            uint64(i),
            time.Now(),
        )
        if err != nil {
            return err
        }
    }

    // Send the batch
    return batch.Send()
}
```

### Using database/sql Interface

If you prefer the standard library interface:

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
    // Open connection using database/sql
    db, err := sql.Open("clickhouse", "clickhouse://default:password@localhost:9000/default")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(10)
    db.SetMaxIdleConns(5)

    // Query using standard interface
    rows, err := db.Query("SELECT event_type, count() FROM events GROUP BY event_type")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var eventType string
        var count uint64
        if err := rows.Scan(&eventType, &count); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s: %d\n", eventType, count)
    }
}
```

## Best Practices

### Connection Management

- **Reuse connections**: Create clients/connections once and reuse them
- **Set timeouts**: Always configure connection and query timeouts
- **Handle errors**: Check for connection errors and implement retries

### Query Safety

- **Use parameters**: Never concatenate user input into queries
- **Validate input**: Check data types before passing to queries
- **Limit results**: Always use LIMIT for potentially large result sets

### Performance

- **Batch inserts**: Group multiple rows into single INSERT statements
- **Stream large results**: Use streaming APIs for queries returning many rows
- **Choose the right format**: JSONEachRow is convenient but not the fastest

### Example: Handling Connection Failures

```python
# Python retry pattern
import clickhouse_connect
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
def query_with_retry(client, sql, parameters=None):
    return client.query(sql, parameters=parameters)

client = clickhouse_connect.get_client(host='localhost')
result = query_with_retry(client, 'SELECT count() FROM events')
```

```javascript
// Node.js retry pattern
const { createClient } = require('@clickhouse/client');

async function queryWithRetry(client, query, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.query({ query, format: 'JSONEachRow' });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

```go
// Go retry pattern
func queryWithRetry(ctx context.Context, conn clickhouse.Conn, query string, maxRetries int) ([]Event, error) {
    var lastErr error
    for attempt := 1; attempt <= maxRetries; attempt++ {
        events, err := queryEvents(ctx, conn, query)
        if err == nil {
            return events, nil
        }
        lastErr = err
        delay := time.Duration(attempt) * time.Second
        time.Sleep(delay)
    }
    return nil, lastErr
}
```

---

Each language has mature ClickHouse clients with good performance characteristics. Choose the native protocol when raw speed matters, or HTTP when you need simplicity and firewall-friendly connections. Whatever you pick, remember to reuse connections, parameterize queries, and batch your inserts.
