# How to Use Listen/Notify for Real-Time Updates in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Real-Time, LISTEN, NOTIFY, Pub/Sub, Event-Driven

Description: Learn how to use PostgreSQL's LISTEN/NOTIFY for real-time communication between database and application. This guide covers setup, triggers, and practical implementations for live updates.

---

PostgreSQL's LISTEN/NOTIFY provides a simple yet powerful pub/sub mechanism built directly into the database. Instead of constantly polling the database for changes, your application can subscribe to channels and receive instant notifications when data changes. This is perfect for real-time dashboards, chat applications, and event-driven architectures.

---

## How LISTEN/NOTIFY Works

```mermaid
sequenceDiagram
    participant App1 as Application 1
    participant DB as PostgreSQL
    participant App2 as Application 2

    App1->>DB: LISTEN channel_name
    Note over App1,DB: App1 is now subscribed

    App2->>DB: INSERT INTO table...
    DB->>DB: Trigger fires NOTIFY
    DB->>App1: Notification (channel, payload)
    Note over App1: Process notification
```

---

## Basic LISTEN/NOTIFY

### Simple Notification

```sql
-- Session 1: Subscribe to channel
LISTEN my_channel;

-- Session 2: Send notification
NOTIFY my_channel, 'Hello, World!';

-- Session 1 receives:
-- Asynchronous notification "my_channel" with payload "Hello, World!" received...
```

### Using pg_notify Function

```sql
-- pg_notify is useful in PL/pgSQL
SELECT pg_notify('my_channel', 'Message payload');

-- Equivalent to:
NOTIFY my_channel, 'Message payload';
```

---

## Trigger-Based Notifications

The real power comes from combining NOTIFY with triggers.

### Notify on Data Changes

```sql
-- Create a notification function
CREATE OR REPLACE FUNCTION notify_data_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    -- Build payload with change information
    payload = json_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'data', CASE TG_OP
            WHEN 'DELETE' THEN row_to_json(OLD)
            ELSE row_to_json(NEW)
        END
    );

    -- Send notification
    PERFORM pg_notify('data_changes', payload::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to table
CREATE TRIGGER users_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION notify_data_change();
```

### Channel Per Table

```sql
-- Create function that uses table name as channel
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
DECLARE
    channel TEXT;
    payload JSON;
BEGIN
    -- Channel name based on table
    channel := TG_TABLE_NAME || '_changes';

    payload = json_build_object(
        'id', CASE TG_OP
            WHEN 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        'action', TG_OP,
        'timestamp', NOW()
    );

    PERFORM pg_notify(channel, payload::text);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for multiple tables
CREATE TRIGGER orders_changes
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_table_change();

CREATE TRIGGER products_changes
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- Listen to specific table changes
LISTEN orders_changes;
LISTEN products_changes;
```

---

## Python Implementation

### Basic Listener

```python
import psycopg2
import select
import json

def listen_for_notifications():
    """Listen for PostgreSQL notifications"""
    conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")
    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

    cur = conn.cursor()
    cur.execute("LISTEN data_changes")

    print("Waiting for notifications on 'data_changes'...")

    while True:
        # Wait for notification with 5 second timeout
        if select.select([conn], [], [], 5) == ([], [], []):
            print("Timeout, still waiting...")
        else:
            conn.poll()
            while conn.notifies:
                notify = conn.notifies.pop(0)
                print(f"Got notification:")
                print(f"  Channel: {notify.channel}")
                print(f"  Payload: {notify.payload}")

                # Parse JSON payload
                data = json.loads(notify.payload)
                handle_notification(data)

def handle_notification(data):
    """Process notification data"""
    table = data.get('table')
    action = data.get('action')
    record = data.get('data')

    print(f"  Table: {table}, Action: {action}")
    print(f"  Record: {record}")

if __name__ == "__main__":
    listen_for_notifications()
```

### Async Listener with asyncpg

```python
import asyncio
import asyncpg
import json

async def notification_handler(conn, pid, channel, payload):
    """Handle incoming notification"""
    data = json.loads(payload)
    print(f"Notification on {channel}:")
    print(f"  Action: {data['action']}")
    print(f"  Data: {data['data']}")

    # Process based on action
    if data['action'] == 'INSERT':
        await on_record_created(data['data'])
    elif data['action'] == 'UPDATE':
        await on_record_updated(data['data'])
    elif data['action'] == 'DELETE':
        await on_record_deleted(data['data'])

async def on_record_created(record):
    print(f"New record created: {record['id']}")

async def on_record_updated(record):
    print(f"Record updated: {record['id']}")

async def on_record_deleted(record):
    print(f"Record deleted: {record['id']}")

async def main():
    # Connect to database
    conn = await asyncpg.connect("postgresql://user:pass@localhost/mydb")

    # Add listener
    await conn.add_listener('data_changes', notification_handler)

    print("Listening for notifications...")

    # Keep running
    try:
        while True:
            await asyncio.sleep(1)
    finally:
        await conn.remove_listener('data_changes', notification_handler)
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Node.js Implementation

```javascript
const { Client } = require('pg');

async function listenForChanges() {
    const client = new Client({
        connectionString: 'postgresql://user:pass@localhost/mydb'
    });

    await client.connect();

    // Subscribe to channels
    await client.query('LISTEN data_changes');
    await client.query('LISTEN orders_changes');

    console.log('Listening for notifications...');

    // Handle notifications
    client.on('notification', (msg) => {
        console.log(`Received notification on ${msg.channel}`);

        try {
            const payload = JSON.parse(msg.payload);
            handleNotification(msg.channel, payload);
        } catch (e) {
            console.error('Failed to parse payload:', e);
        }
    });

    // Handle connection errors
    client.on('error', (err) => {
        console.error('Database error:', err);
        process.exit(1);
    });
}

function handleNotification(channel, payload) {
    console.log(`Channel: ${channel}`);
    console.log(`Action: ${payload.action}`);
    console.log(`Data:`, payload.data);

    // Emit to WebSocket clients, update cache, etc.
    switch (payload.action) {
        case 'INSERT':
            broadcastNewRecord(channel, payload.data);
            break;
        case 'UPDATE':
            broadcastUpdate(channel, payload.data);
            break;
        case 'DELETE':
            broadcastDelete(channel, payload.data);
            break;
    }
}

function broadcastNewRecord(channel, data) {
    // Send to connected WebSocket clients
    console.log(`Broadcasting new ${channel} record`);
}

function broadcastUpdate(channel, data) {
    console.log(`Broadcasting ${channel} update`);
}

function broadcastDelete(channel, data) {
    console.log(`Broadcasting ${channel} deletion`);
}

listenForChanges().catch(console.error);
```

---

## Real-Time Dashboard Example

### Backend (Python/FastAPI)

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List
import asyncpg
import asyncio
import json

app = FastAPI()

# Connected WebSocket clients
clients: List[WebSocket] = []

async def db_listener():
    """Listen for database notifications and broadcast to clients"""
    conn = await asyncpg.connect("postgresql://user:pass@localhost/mydb")

    async def on_notification(conn, pid, channel, payload):
        # Broadcast to all connected clients
        data = json.loads(payload)
        message = json.dumps({
            "type": "db_change",
            "channel": channel,
            "data": data
        })

        disconnected = []
        for client in clients:
            try:
                await client.send_text(message)
            except:
                disconnected.append(client)

        # Remove disconnected clients
        for client in disconnected:
            clients.remove(client)

    await conn.add_listener('dashboard_updates', on_notification)

    # Keep listener running
    while True:
        await asyncio.sleep(1)

@app.on_event("startup")
async def startup():
    # Start database listener
    asyncio.create_task(db_listener())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.remove(websocket)
```

### Frontend (JavaScript)

```javascript
class DashboardUpdater {
    constructor() {
        this.socket = null;
        this.reconnectInterval = 5000;
        this.handlers = new Map();
    }

    connect() {
        this.socket = new WebSocket('ws://localhost:8000/ws');

        this.socket.onopen = () => {
            console.log('Connected to real-time updates');
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.socket.onclose = () => {
            console.log('Disconnected, reconnecting...');
            setTimeout(() => this.connect(), this.reconnectInterval);
        };
    }

    handleMessage(message) {
        if (message.type === 'db_change') {
            const { channel, data } = message;

            // Update UI based on change
            if (data.action === 'INSERT') {
                this.addRow(data.data);
            } else if (data.action === 'UPDATE') {
                this.updateRow(data.data);
            } else if (data.action === 'DELETE') {
                this.removeRow(data.data);
            }
        }
    }

    addRow(record) {
        const table = document.getElementById('data-table');
        const row = document.createElement('tr');
        row.id = `row-${record.id}`;
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.name}</td>
            <td>${record.status}</td>
        `;
        table.appendChild(row);
        row.classList.add('highlight-new');
    }

    updateRow(record) {
        const row = document.getElementById(`row-${record.id}`);
        if (row) {
            row.querySelector('td:nth-child(2)').textContent = record.name;
            row.querySelector('td:nth-child(3)').textContent = record.status;
            row.classList.add('highlight-updated');
            setTimeout(() => row.classList.remove('highlight-updated'), 2000);
        }
    }

    removeRow(record) {
        const row = document.getElementById(`row-${record.id}`);
        if (row) {
            row.classList.add('removing');
            setTimeout(() => row.remove(), 500);
        }
    }
}

// Initialize
const dashboard = new DashboardUpdater();
dashboard.connect();
```

---

## Advanced Patterns

### Selective Notifications

```sql
-- Only notify for important changes
CREATE OR REPLACE FUNCTION notify_important_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify when status changes to 'critical'
    IF TG_OP = 'UPDATE' AND NEW.status = 'critical' AND OLD.status != 'critical' THEN
        PERFORM pg_notify('alerts',
            json_build_object(
                'id', NEW.id,
                'message', 'Status changed to critical',
                'timestamp', NOW()
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Debounced Notifications

```sql
-- Prevent notification storms with debouncing
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,
    channel TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Queue notifications instead of sending immediately
CREATE OR REPLACE FUNCTION queue_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_queue (channel, payload)
    VALUES (
        TG_TABLE_NAME || '_changes',
        json_build_object('id', NEW.id, 'action', TG_OP)::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Separate process sends batched notifications
-- Run every second:
-- SELECT pg_notify(channel, json_agg(payload)::text)
-- FROM notification_queue WHERE NOT processed
-- GROUP BY channel;
```

### Payload Size Limits

```sql
-- NOTIFY payload is limited to 8000 bytes
-- For large data, send only IDs

CREATE OR REPLACE FUNCTION notify_with_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Send minimal payload
    PERFORM pg_notify(
        TG_TABLE_NAME || '_changes',
        json_build_object(
            'id', CASE TG_OP
                WHEN 'DELETE' THEN OLD.id
                ELSE NEW.id
            END,
            'action', TG_OP
        )::text
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Client fetches full record if needed
-- SELECT * FROM users WHERE id = notification_id;
```

---

## Monitoring and Troubleshooting

```sql
-- Check for pending notifications
SELECT * FROM pg_stat_activity
WHERE query LIKE '%LISTEN%';

-- View notification queue (if using queue pattern)
SELECT
    channel,
    COUNT(*) as pending,
    MIN(created_at) as oldest
FROM notification_queue
WHERE NOT processed
GROUP BY channel;
```

---

## Best Practices

1. **Keep payloads small** - Stay under 8000 bytes, send IDs only for large data
2. **Use connection pooling carefully** - Each listener needs a dedicated connection
3. **Handle reconnection** - Always implement reconnect logic in clients
4. **Consider message ordering** - Notifications may arrive out of order under load
5. **Use channels wisely** - Too many channels can be hard to manage
6. **Monitor listener connections** - Ensure listeners stay connected

---

## Conclusion

PostgreSQL's LISTEN/NOTIFY provides a simple, built-in way to push real-time updates to your application:

- No external message queue needed for simple use cases
- Integrates naturally with database triggers
- Works with any PostgreSQL client library
- Perfect for real-time dashboards and notifications

For high-volume scenarios, consider using dedicated message queues (RabbitMQ, Redis Pub/Sub), but for many applications, LISTEN/NOTIFY is the simplest solution.

---

*Need to monitor your PostgreSQL real-time notifications? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including notification tracking, listener health, and connection alerts.*
