# How to Implement PostgreSQL Event Triggers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Triggers, DDL, Database

Description: Learn how to use PostgreSQL event triggers for tracking DDL changes and schema management.

---

PostgreSQL event triggers are a powerful feature that allows you to capture and respond to Data Definition Language (DDL) statements. Unlike regular triggers that fire on data changes (INSERT, UPDATE, DELETE), event triggers fire on schema changes like CREATE TABLE, ALTER INDEX, or DROP FUNCTION. This makes them invaluable for auditing schema changes, enforcing naming conventions, preventing accidental drops, and maintaining change logs.

In this guide, we will explore the three types of DDL event triggers, build practical examples for schema change tracking, and implement a complete audit system.

## Why Track DDL Changes?

Schema changes in production databases can have significant impacts:

- **Audit compliance**: Many regulations require tracking who changed what and when
- **Debugging**: Understanding when a column was added or a constraint changed
- **Change management**: Reviewing schema changes before deployment
- **Disaster recovery**: Reconstructing schema history after incidents
- **Team coordination**: Keeping multiple teams informed of database changes

Event triggers provide a native PostgreSQL solution for capturing these changes without relying on external tools or manual processes.

## Event Trigger Architecture

```mermaid
flowchart TB
    subgraph Client
        APP[Application / DBA]
    end

    subgraph PostgreSQL
        DDL[DDL Statement]
        ET1[ddl_command_start]
        EXEC[Command Execution]
        ET2[ddl_command_end]
        ET3[sql_drop]
        COMMIT[Transaction Commit]
    end

    subgraph Audit System
        LOG[(Audit Log Table)]
        NOTIFY[NOTIFY Channel]
    end

    APP --> DDL
    DDL --> ET1
    ET1 --> EXEC
    EXEC --> ET2
    EXEC --> ET3
    ET2 --> LOG
    ET3 --> LOG
    ET2 --> NOTIFY
    ET3 --> COMMIT
```

## Understanding the Three Event Types

PostgreSQL provides three distinct event trigger timing points:

### Event Trigger Types Overview

```mermaid
sequenceDiagram
    participant Client
    participant PostgreSQL
    participant ddl_command_start
    participant Execution
    participant ddl_command_end
    participant sql_drop

    Client->>PostgreSQL: DROP TABLE users;
    PostgreSQL->>ddl_command_start: Fire trigger (before execution)
    Note over ddl_command_start: Can prevent execution<br/>Limited context available
    ddl_command_start-->>PostgreSQL: Continue or RAISE EXCEPTION
    PostgreSQL->>Execution: Execute DROP TABLE
    PostgreSQL->>sql_drop: Fire trigger (object details available)
    Note over sql_drop: Full details of dropped objects<br/>Object still accessible
    PostgreSQL->>ddl_command_end: Fire trigger (after execution)
    Note over ddl_command_end: Full context via pg_event_trigger_ddl_commands()
    ddl_command_end-->>Client: Command completed
```

### 1. ddl_command_start

This event fires before a DDL command executes. It is useful for:

- Preventing certain operations entirely
- Logging the intent before execution
- Enforcing time-based restrictions

**Limitations**: You cannot access details about the objects being modified because the command has not executed yet.

### 2. ddl_command_end

This event fires after a DDL command completes successfully. It is the most commonly used event because:

- Full command details are available via `pg_event_trigger_ddl_commands()`
- The operation has succeeded, so logging is meaningful
- You can inspect the new state of objects

### 3. sql_drop

This event fires specifically for DROP operations, providing detailed information about the objects being dropped. It fires after the drop but within the same transaction, so:

- Object metadata is still accessible
- You can capture what was deleted before it is gone
- Fires even for cascaded drops

## Setting Up the Audit Infrastructure

Let us build a complete DDL audit system step by step.

### Step 1: Create the Audit Log Table

```sql
-- Create a dedicated schema for audit objects
-- Keeping audit objects separate makes management easier
CREATE SCHEMA IF NOT EXISTS audit;

-- Main audit log table for all DDL events
-- This table stores comprehensive information about every schema change
CREATE TABLE audit.ddl_history (
    id BIGSERIAL PRIMARY KEY,

    -- Event metadata
    event_id UUID DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,        -- ddl_command_start, ddl_command_end, sql_drop
    command_tag VARCHAR(100) NOT NULL,       -- CREATE TABLE, ALTER INDEX, etc.

    -- Object information
    object_type VARCHAR(100),                -- table, index, function, etc.
    schema_name VARCHAR(255),                -- Schema containing the object
    object_name VARCHAR(255),                -- Name of the affected object
    object_identity TEXT,                    -- Fully qualified object identifier

    -- Change details
    ddl_command TEXT,                        -- The actual SQL command (when available)

    -- Context information
    session_user VARCHAR(255) NOT NULL,      -- User who executed the command
    current_user VARCHAR(255) NOT NULL,      -- Effective user (may differ with SET ROLE)
    application_name VARCHAR(255),           -- Application that issued the command
    client_addr INET,                        -- Client IP address
    client_port INTEGER,                     -- Client port

    -- Transaction context
    transaction_id BIGINT,                   -- PostgreSQL transaction ID

    -- Timestamps
    event_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Additional metadata stored as JSON for flexibility
    additional_info JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for common query patterns
-- Index on timestamp for chronological queries
CREATE INDEX idx_ddl_history_timestamp
ON audit.ddl_history(event_timestamp DESC);

-- Index on object identity for finding changes to specific objects
CREATE INDEX idx_ddl_history_object
ON audit.ddl_history(schema_name, object_name);

-- Index on user for auditing specific users
CREATE INDEX idx_ddl_history_user
ON audit.ddl_history(session_user);

-- Index on command type for filtering by operation
CREATE INDEX idx_ddl_history_command
ON audit.ddl_history(command_tag);

-- GIN index on additional_info for JSON queries
CREATE INDEX idx_ddl_history_info
ON audit.ddl_history USING GIN(additional_info);

-- Comment the table for documentation
COMMENT ON TABLE audit.ddl_history IS
    'Audit log for all DDL operations captured by event triggers';
```

### Step 2: Create a Table for Dropped Objects

```sql
-- Separate table for tracking dropped objects with more detail
-- This captures information that would otherwise be lost
CREATE TABLE audit.dropped_objects (
    id BIGSERIAL PRIMARY KEY,

    -- Link to the main audit log
    ddl_history_id BIGINT REFERENCES audit.ddl_history(id),

    -- Dropped object details
    object_type VARCHAR(100) NOT NULL,       -- Type of dropped object
    schema_name VARCHAR(255),                -- Schema that contained the object
    object_name VARCHAR(255),                -- Name of the dropped object
    object_identity TEXT,                    -- Full identifier

    -- Cascade information
    is_cascade BOOLEAN DEFAULT FALSE,        -- Was this dropped via CASCADE?
    original_drop_identity TEXT,             -- What triggered the cascade

    -- Additional details
    address_names TEXT[],                    -- Object address components
    address_args TEXT[],                     -- Object address arguments

    -- Timestamp
    dropped_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for finding drops by object
CREATE INDEX idx_dropped_objects_identity
ON audit.dropped_objects(schema_name, object_name);

-- Index for finding cascade drops
CREATE INDEX idx_dropped_objects_cascade
ON audit.dropped_objects(original_drop_identity)
WHERE is_cascade = TRUE;
```

## Implementing ddl_command_start Trigger

The `ddl_command_start` event fires before command execution. Use it for prevention and early logging.

```sql
-- Function to handle ddl_command_start events
-- This function can prevent operations or log the intent
CREATE OR REPLACE FUNCTION audit.handle_ddl_start()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with definer privileges for audit access
AS $$
DECLARE
    v_command_tag TEXT;
    v_current_hour INTEGER;
BEGIN
    -- Get the command tag (CREATE TABLE, DROP INDEX, etc.)
    -- tg_tag contains the command type
    v_command_tag := tg_tag;

    -- Get current hour for time-based restrictions
    v_current_hour := EXTRACT(HOUR FROM CURRENT_TIMESTAMP);

    -- Example: Prevent DROP operations during business hours
    -- Adjust the hours and commands based on your policy
    IF v_command_tag LIKE 'DROP%' THEN
        -- Block drops between 9 AM and 6 PM on weekdays
        IF v_current_hour BETWEEN 9 AND 17
           AND EXTRACT(DOW FROM CURRENT_TIMESTAMP) BETWEEN 1 AND 5 THEN

            -- Allow superusers to bypass this restriction
            IF NOT (SELECT usesuper FROM pg_user WHERE usename = CURRENT_USER) THEN
                RAISE EXCEPTION 'DROP operations are not allowed during business hours (9 AM - 6 PM). '
                    'Please schedule this change for the maintenance window.';
            END IF;
        END IF;
    END IF;

    -- Example: Prevent certain dangerous operations entirely
    -- You can customize this list based on your needs
    IF v_command_tag IN ('DROP DATABASE', 'DROP SCHEMA') THEN
        -- Only allow in specific databases (e.g., not production)
        IF current_database() = 'production' THEN
            RAISE EXCEPTION 'Direct % is not allowed in production. '
                'Please use the migration system.', v_command_tag;
        END IF;
    END IF;

    -- Log the start of the command
    -- Note: Limited information available at this stage
    INSERT INTO audit.ddl_history (
        event_type,
        command_tag,
        session_user,
        current_user,
        application_name,
        client_addr,
        transaction_id
    ) VALUES (
        'ddl_command_start',
        v_command_tag,
        session_user,
        current_user,
        current_setting('application_name', TRUE),
        inet_client_addr(),
        txid_current()
    );

END;
$$;

-- Create the event trigger for ddl_command_start
-- This will fire for all DDL commands
CREATE EVENT TRIGGER audit_ddl_start
ON ddl_command_start
EXECUTE FUNCTION audit.handle_ddl_start();

-- Add a comment for documentation
COMMENT ON EVENT TRIGGER audit_ddl_start IS
    'Captures DDL command start events for auditing and can prevent dangerous operations';
```

### Filtering ddl_command_start Events

You can filter which commands trigger the event:

```sql
-- Create a more targeted event trigger
-- This one only fires for DROP commands
DROP EVENT TRIGGER IF EXISTS audit_ddl_start;

CREATE EVENT TRIGGER audit_ddl_start
ON ddl_command_start
WHEN TAG IN (
    'DROP TABLE',
    'DROP INDEX',
    'DROP FUNCTION',
    'DROP PROCEDURE',
    'DROP VIEW',
    'DROP TRIGGER',
    'DROP SCHEMA'
)
EXECUTE FUNCTION audit.handle_ddl_start();
```

## Implementing ddl_command_end Trigger

The `ddl_command_end` event provides the most detailed information about completed DDL operations.

```sql
-- Function to handle ddl_command_end events
-- This is the primary audit function with full command details
CREATE OR REPLACE FUNCTION audit.handle_ddl_end()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_obj RECORD;
    v_history_id BIGINT;
    v_ddl_command TEXT;
BEGIN
    -- Iterate through all objects affected by this DDL command
    -- pg_event_trigger_ddl_commands() returns details about each object
    FOR v_obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        -- Attempt to get the actual DDL command
        -- This uses pg_get_functiondef, pg_get_viewdef, etc. based on object type
        BEGIN
            v_ddl_command := NULL;

            -- Get DDL for different object types
            CASE v_obj.object_type
                WHEN 'function' THEN
                    v_ddl_command := pg_get_functiondef(v_obj.objid);
                WHEN 'view' THEN
                    v_ddl_command := pg_get_viewdef(v_obj.objid, TRUE);
                WHEN 'index' THEN
                    v_ddl_command := pg_get_indexdef(v_obj.objid);
                WHEN 'trigger' THEN
                    v_ddl_command := pg_get_triggerdef(
                        (SELECT oid FROM pg_trigger WHERE tgname = v_obj.object_identity)
                    );
                ELSE
                    -- For other types, we cannot easily reconstruct the DDL
                    v_ddl_command := NULL;
            END CASE;
        EXCEPTION WHEN OTHERS THEN
            -- Some objects may not have a definition function
            v_ddl_command := NULL;
        END;

        -- Insert the audit record
        INSERT INTO audit.ddl_history (
            event_type,
            command_tag,
            object_type,
            schema_name,
            object_name,
            object_identity,
            ddl_command,
            session_user,
            current_user,
            application_name,
            client_addr,
            client_port,
            transaction_id,
            additional_info
        ) VALUES (
            'ddl_command_end',
            tg_tag,
            v_obj.object_type,
            v_obj.schema_name,
            -- Extract the object name from the identity
            CASE
                WHEN v_obj.object_identity LIKE '%.%'
                THEN split_part(v_obj.object_identity, '.', 2)
                ELSE v_obj.object_identity
            END,
            v_obj.object_identity,
            v_ddl_command,
            session_user,
            current_user,
            current_setting('application_name', TRUE),
            inet_client_addr(),
            inet_client_port(),
            txid_current(),
            jsonb_build_object(
                'classid', v_obj.classid,
                'objid', v_obj.objid,
                'objsubid', v_obj.objsubid,
                'in_extension', v_obj.in_extension
            )
        )
        RETURNING id INTO v_history_id;

        -- Send a notification for real-time monitoring
        -- Applications can LISTEN to this channel for alerts
        PERFORM pg_notify(
            'ddl_changes',
            jsonb_build_object(
                'history_id', v_history_id,
                'command', tg_tag,
                'object_type', v_obj.object_type,
                'object_identity', v_obj.object_identity,
                'user', session_user,
                'timestamp', CURRENT_TIMESTAMP
            )::text
        );

    END LOOP;
END;
$$;

-- Create the event trigger for ddl_command_end
CREATE EVENT TRIGGER audit_ddl_end
ON ddl_command_end
EXECUTE FUNCTION audit.handle_ddl_end();

COMMENT ON EVENT TRIGGER audit_ddl_end IS
    'Captures completed DDL operations with full object details for auditing';
```

## Implementing sql_drop Trigger

The `sql_drop` event provides detailed information about dropped objects, including cascaded drops.

```sql
-- Function to handle sql_drop events
-- Captures details about objects before they are permanently removed
CREATE OR REPLACE FUNCTION audit.handle_sql_drop()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_obj RECORD;
    v_history_id BIGINT;
    v_original_identity TEXT := NULL;
    v_is_first BOOLEAN := TRUE;
BEGIN
    -- First, create the main audit record for the DROP command
    INSERT INTO audit.ddl_history (
        event_type,
        command_tag,
        session_user,
        current_user,
        application_name,
        client_addr,
        client_port,
        transaction_id
    ) VALUES (
        'sql_drop',
        tg_tag,
        session_user,
        current_user,
        current_setting('application_name', TRUE),
        inet_client_addr(),
        inet_client_port(),
        txid_current()
    )
    RETURNING id INTO v_history_id;

    -- Iterate through all dropped objects
    -- pg_event_trigger_dropped_objects() returns details about each dropped object
    FOR v_obj IN SELECT * FROM pg_event_trigger_dropped_objects()
    LOOP
        -- Track the first object as the original drop target
        -- Subsequent objects are cascade drops
        IF v_is_first THEN
            v_original_identity := v_obj.object_identity;
            v_is_first := FALSE;
        END IF;

        -- Insert record for each dropped object
        INSERT INTO audit.dropped_objects (
            ddl_history_id,
            object_type,
            schema_name,
            object_name,
            object_identity,
            is_cascade,
            original_drop_identity,
            address_names,
            address_args
        ) VALUES (
            v_history_id,
            v_obj.object_type,
            v_obj.schema_name,
            v_obj.object_name,
            v_obj.object_identity,
            v_obj.object_identity != v_original_identity,  -- Cascade if not the original
            v_original_identity,
            v_obj.address_names,
            v_obj.address_args
        );

        -- Update the main history record with primary object info
        IF v_obj.object_identity = v_original_identity THEN
            UPDATE audit.ddl_history
            SET
                object_type = v_obj.object_type,
                schema_name = v_obj.schema_name,
                object_name = v_obj.object_name,
                object_identity = v_obj.object_identity
            WHERE id = v_history_id;
        END IF;

        -- Send notification for dropped objects
        PERFORM pg_notify(
            'ddl_drops',
            jsonb_build_object(
                'history_id', v_history_id,
                'object_type', v_obj.object_type,
                'object_identity', v_obj.object_identity,
                'is_cascade', v_obj.object_identity != v_original_identity,
                'user', session_user,
                'timestamp', CURRENT_TIMESTAMP
            )::text
        );

    END LOOP;
END;
$$;

-- Create the event trigger for sql_drop
CREATE EVENT TRIGGER audit_sql_drop
ON sql_drop
EXECUTE FUNCTION audit.handle_sql_drop();

COMMENT ON EVENT TRIGGER audit_sql_drop IS
    'Captures details about dropped objects including CASCADE dependencies';
```

## Schema Change Tracking in Action

```mermaid
flowchart LR
    subgraph DDL Operations
        CREATE[CREATE TABLE]
        ALTER[ALTER TABLE]
        DROP[DROP TABLE CASCADE]
    end

    subgraph Event Triggers
        START[ddl_command_start<br/>Prevention & Early Log]
        END_T[ddl_command_end<br/>Full Details]
        DROP_T[sql_drop<br/>Dropped Objects]
    end

    subgraph Audit Storage
        HIST[(ddl_history)]
        DROPS[(dropped_objects)]
    end

    subgraph Notifications
        NOTIFY[pg_notify<br/>ddl_changes]
        LISTEN[Monitoring App<br/>LISTEN]
    end

    CREATE --> START
    ALTER --> START
    DROP --> START

    START --> END_T
    START --> DROP_T

    END_T --> HIST
    DROP_T --> HIST
    DROP_T --> DROPS

    END_T --> NOTIFY
    DROP_T --> NOTIFY
    NOTIFY --> LISTEN
```

## Practical Examples

### Example 1: Track Table Schema Changes

```sql
-- Create a test table
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add a column
ALTER TABLE public.users ADD COLUMN username VARCHAR(100);

-- Add an index
CREATE INDEX idx_users_email ON public.users(email);

-- Query the audit log to see what was captured
SELECT
    event_timestamp,
    command_tag,
    object_type,
    object_identity,
    session_user,
    ddl_command
FROM audit.ddl_history
WHERE schema_name = 'public'
  AND object_name LIKE '%users%'
ORDER BY event_timestamp DESC;
```

### Example 2: Monitor for Dangerous Operations

```sql
-- Create a function that sends alerts for dangerous operations
CREATE OR REPLACE FUNCTION audit.alert_on_dangerous_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_obj RECORD;
    v_alert_message TEXT;
BEGIN
    FOR v_obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        -- Check for operations on critical tables
        IF v_obj.schema_name = 'public' AND v_obj.object_identity IN (
            'public.users',
            'public.orders',
            'public.payments'
        ) THEN
            v_alert_message := format(
                'ALERT: %s operation on critical table %s by user %s',
                tg_tag,
                v_obj.object_identity,
                session_user
            );

            -- Send to monitoring channel
            PERFORM pg_notify('critical_ddl_alerts', v_alert_message);

            -- Also log to a separate alerts table if needed
            RAISE NOTICE '%', v_alert_message;
        END IF;
    END LOOP;
END;
$$;

CREATE EVENT TRIGGER alert_dangerous_ddl
ON ddl_command_end
WHEN TAG IN ('ALTER TABLE', 'DROP TABLE', 'TRUNCATE')
EXECUTE FUNCTION audit.alert_on_dangerous_ddl();
```

### Example 3: Enforce Naming Conventions

```sql
-- Create a function to enforce naming conventions
CREATE OR REPLACE FUNCTION audit.enforce_naming_conventions()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_obj RECORD;
BEGIN
    FOR v_obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        -- Enforce table naming: must be lowercase with underscores
        IF v_obj.object_type = 'table' THEN
            IF v_obj.object_identity !~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$' THEN
                RAISE EXCEPTION 'Table names must be lowercase with underscores. Got: %',
                    v_obj.object_identity;
            END IF;
        END IF;

        -- Enforce index naming: must start with idx_
        IF v_obj.object_type = 'index' THEN
            IF v_obj.object_identity !~ '\.idx_' THEN
                RAISE EXCEPTION 'Index names must start with idx_. Got: %',
                    v_obj.object_identity;
            END IF;
        END IF;

        -- Enforce function naming: must start with fn_ or sp_
        IF v_obj.object_type = 'function' THEN
            IF v_obj.object_identity !~ '\.(fn_|sp_)' THEN
                RAISE WARNING 'Consider using fn_ or sp_ prefix for functions: %',
                    v_obj.object_identity;
            END IF;
        END IF;
    END LOOP;
END;
$$;

CREATE EVENT TRIGGER enforce_naming
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE INDEX', 'CREATE FUNCTION')
EXECUTE FUNCTION audit.enforce_naming_conventions();
```

### Example 4: Build a Schema Change Report

```sql
-- Function to generate a schema change report
CREATE OR REPLACE FUNCTION audit.generate_change_report(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    change_date DATE,
    total_changes BIGINT,
    creates BIGINT,
    alters BIGINT,
    drops BIGINT,
    users_involved TEXT[],
    objects_affected TEXT[]
)
LANGUAGE SQL
AS $$
    SELECT
        DATE(event_timestamp) AS change_date,
        COUNT(*) AS total_changes,
        COUNT(*) FILTER (WHERE command_tag LIKE 'CREATE%') AS creates,
        COUNT(*) FILTER (WHERE command_tag LIKE 'ALTER%') AS alters,
        COUNT(*) FILTER (WHERE command_tag LIKE 'DROP%') AS drops,
        ARRAY_AGG(DISTINCT session_user) AS users_involved,
        ARRAY_AGG(DISTINCT object_identity) FILTER (WHERE object_identity IS NOT NULL) AS objects_affected
    FROM audit.ddl_history
    WHERE event_timestamp BETWEEN p_start_date AND p_end_date
      AND event_type = 'ddl_command_end'
    GROUP BY DATE(event_timestamp)
    ORDER BY change_date DESC;
$$;

-- Usage:
-- SELECT * FROM audit.generate_change_report('2026-01-01'::timestamptz);
```

## Listening for Real-Time Notifications

```python
"""
Real-time DDL Change Listener

This module demonstrates how to listen for DDL change
notifications from PostgreSQL event triggers.
"""

import psycopg2
import psycopg2.extensions
import select
import json
from datetime import datetime
from typing import Callable, Dict, Any


class DDLChangeListener:
    """
    Listens for DDL change notifications from PostgreSQL.

    Uses LISTEN/NOTIFY for real-time event streaming.
    """

    def __init__(self, connection_string: str):
        """
        Initialize the listener.

        Args:
            connection_string: PostgreSQL connection string
        """
        self.connection_string = connection_string
        self.conn = None
        self.handlers: Dict[str, Callable] = {}

    def connect(self):
        """Establish database connection and set up listening."""
        self.conn = psycopg2.connect(self.connection_string)

        # Set connection to async mode for non-blocking notifications
        self.conn.set_isolation_level(
            psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
        )

        # Create cursor and start listening
        cursor = self.conn.cursor()

        # Listen to DDL change channels
        cursor.execute("LISTEN ddl_changes;")
        cursor.execute("LISTEN ddl_drops;")
        cursor.execute("LISTEN critical_ddl_alerts;")

        print("Listening for DDL changes...")

    def register_handler(self, channel: str, handler: Callable[[Dict[str, Any]], None]):
        """
        Register a handler for a specific channel.

        Args:
            channel: Notification channel name
            handler: Function to call when notification received
        """
        self.handlers[channel] = handler

    def process_notification(self, notify):
        """
        Process a received notification.

        Args:
            notify: psycopg2 Notify object
        """
        channel = notify.channel
        payload = notify.payload

        print(f"\n[{datetime.now().isoformat()}] Received on {channel}:")

        # Parse JSON payload
        try:
            data = json.loads(payload)
            print(json.dumps(data, indent=2))

            # Call registered handler if exists
            if channel in self.handlers:
                self.handlers[channel](data)

        except json.JSONDecodeError:
            # Plain text notification
            print(f"  {payload}")

    def run(self):
        """
        Main listening loop.

        Blocks and processes notifications as they arrive.
        """
        if not self.conn:
            self.connect()

        try:
            while True:
                # Wait for notifications with timeout
                # select() returns when data is available or timeout
                if select.select([self.conn], [], [], 5) == ([], [], []):
                    # Timeout, no notifications
                    continue

                # Process any pending notifications
                self.conn.poll()

                while self.conn.notifies:
                    notify = self.conn.notifies.pop(0)
                    self.process_notification(notify)

        except KeyboardInterrupt:
            print("\nShutting down listener...")
        finally:
            if self.conn:
                self.conn.close()


def handle_ddl_change(data: Dict[str, Any]):
    """Example handler for DDL changes."""
    object_type = data.get('object_type', 'unknown')
    command = data.get('command', 'unknown')
    identity = data.get('object_identity', 'unknown')

    print(f"  Action: {command} on {object_type}")
    print(f"  Object: {identity}")

    # Add your custom logic here:
    # - Send to Slack/Teams
    # - Update a dashboard
    # - Trigger a CI/CD pipeline
    # - Update documentation


def handle_drop_event(data: Dict[str, Any]):
    """Example handler for DROP events."""
    if data.get('is_cascade'):
        print("  WARNING: This was a CASCADE drop!")
        # Alert on cascade drops as they can have unexpected effects


def main():
    """Run the DDL change listener."""
    # Connection string for your PostgreSQL database
    conn_string = "postgresql://user:password@localhost:5432/mydb"

    listener = DDLChangeListener(conn_string)

    # Register handlers for different channels
    listener.register_handler('ddl_changes', handle_ddl_change)
    listener.register_handler('ddl_drops', handle_drop_event)

    # Start listening
    listener.run()


if __name__ == "__main__":
    main()
```

## Managing Event Triggers

### View All Event Triggers

```sql
-- List all event triggers in the database
SELECT
    evtname AS trigger_name,
    evtevent AS event_type,
    evtowner::regrole AS owner,
    evtfoid::regproc AS function_name,
    evtenabled AS status,
    evttags AS filtered_tags
FROM pg_event_trigger
ORDER BY evtname;
```

### Enable and Disable Event Triggers

```sql
-- Disable an event trigger temporarily
-- Useful during bulk migrations
ALTER EVENT TRIGGER audit_ddl_end DISABLE;

-- Re-enable the trigger
ALTER EVENT TRIGGER audit_ddl_end ENABLE;

-- Enable trigger only for superusers (replica mode)
ALTER EVENT TRIGGER audit_ddl_end ENABLE REPLICA;

-- Enable trigger always (even in replica mode)
ALTER EVENT TRIGGER audit_ddl_end ENABLE ALWAYS;
```

### Drop Event Triggers

```sql
-- Remove an event trigger
DROP EVENT TRIGGER IF EXISTS audit_ddl_start;
DROP EVENT TRIGGER IF EXISTS audit_ddl_end;
DROP EVENT TRIGGER IF EXISTS audit_sql_drop;
```

## Audit Log Maintenance

```sql
-- Create a function to archive old audit records
CREATE OR REPLACE FUNCTION audit.archive_old_records(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_retention_days || ' days')::INTERVAL;

    -- Create archive table if not exists
    CREATE TABLE IF NOT EXISTS audit.ddl_history_archive (
        LIKE audit.ddl_history INCLUDING ALL
    );

    -- Move old records to archive
    WITH archived AS (
        DELETE FROM audit.ddl_history
        WHERE event_timestamp < v_cutoff_date
        RETURNING *
    )
    INSERT INTO audit.ddl_history_archive
    SELECT * FROM archived;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Also archive dropped_objects
    CREATE TABLE IF NOT EXISTS audit.dropped_objects_archive (
        LIKE audit.dropped_objects INCLUDING ALL
    );

    WITH archived AS (
        DELETE FROM audit.dropped_objects
        WHERE dropped_at < v_cutoff_date
        RETURNING *
    )
    INSERT INTO audit.dropped_objects_archive
    SELECT * FROM archived;

    RETURN v_archived_count;
END;
$$;

-- Schedule this function to run periodically using pg_cron or external scheduler
-- SELECT cron.schedule('archive-ddl-audit', '0 2 * * 0', 'SELECT audit.archive_old_records(90)');
```

## Best Practices

### 1. Performance Considerations

```mermaid
flowchart TD
    subgraph Performance Tips
        A[Use WHEN clause to filter events]
        B[Avoid complex logic in ddl_command_start]
        C[Use async notifications vs sync logging]
        D[Index audit tables appropriately]
        E[Archive old records regularly]
    end

    subgraph Avoid
        F[Logging every DDL start and end]
        G[Complex validation in triggers]
        H[Unbounded audit table growth]
    end

    A --> GOOD[Good Performance]
    B --> GOOD
    C --> GOOD
    D --> GOOD
    E --> GOOD

    F --> BAD[Poor Performance]
    G --> BAD
    H --> BAD
```

### 2. Security Recommendations

```sql
-- Grant minimal permissions to the audit schema
REVOKE ALL ON SCHEMA audit FROM PUBLIC;

-- Only allow specific roles to query audit data
GRANT USAGE ON SCHEMA audit TO audit_readers;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO audit_readers;

-- Prevent modifications to audit data
REVOKE INSERT, UPDATE, DELETE ON audit.ddl_history FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON audit.dropped_objects FROM PUBLIC;

-- The trigger functions run as SECURITY DEFINER
-- so they can write to audit tables even when users cannot
```

### 3. Testing Event Triggers

```sql
-- Create a test schema for safe testing
CREATE SCHEMA IF NOT EXISTS test_schema;

-- Test the triggers with sample operations
BEGIN;
    -- This should be captured by ddl_command_end
    CREATE TABLE test_schema.test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100)
    );

    -- This should be captured by ddl_command_end
    ALTER TABLE test_schema.test_table ADD COLUMN email VARCHAR(255);

    -- This should be captured by sql_drop
    DROP TABLE test_schema.test_table;
COMMIT;

-- Verify the audit records
SELECT
    event_type,
    command_tag,
    object_identity,
    event_timestamp
FROM audit.ddl_history
WHERE schema_name = 'test_schema'
ORDER BY event_timestamp;
```

## Conclusion

PostgreSQL event triggers provide a powerful, native mechanism for tracking DDL changes. Here is what we covered:

1. **ddl_command_start**: Fires before DDL execution. Use it to prevent dangerous operations or log intent.

2. **ddl_command_end**: Fires after successful DDL. Provides the most detailed information and is the primary audit point.

3. **sql_drop**: Fires specifically for DROP operations. Captures details about dropped objects including cascaded dependencies.

Key takeaways:

- Event triggers enable comprehensive schema change auditing without external tools
- Use the WHEN clause to filter events and improve performance
- Combine LISTEN/NOTIFY for real-time monitoring
- Implement proper archive strategies to manage audit table growth
- Always test event triggers in a non-production environment first

With the examples provided, you can implement a complete DDL tracking system tailored to your compliance and operational needs.
