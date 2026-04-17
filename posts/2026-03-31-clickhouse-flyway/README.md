# How to Use Flyway with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Flyway, Schema Migration, DevOps, Database

Description: Learn how to configure Flyway for ClickHouse schema migrations, including JDBC driver setup, versioned scripts, and CI/CD pipeline integration.

---

Flyway is a widely-used Java-based schema migration tool. With the ClickHouse JDBC driver, it can manage versioned schema changes for ClickHouse databases using the same familiar workflow as other databases.

## Prerequisites

- Java 11+
- Flyway CLI or Maven/Gradle plugin
- ClickHouse JDBC driver

## Installing Flyway CLI

```bash
wget -qO- https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/10.22.0/flyway-commandline-10.22.0-linux-x64.tar.gz | tar -xz
export PATH=$PATH:flyway-10.22.0
```

## Adding the ClickHouse JDBC Driver and Flyway Plugin

ClickHouse support is not bundled with the Flyway CLI, so you must add both the ClickHouse JDBC driver and the `flyway-database-clickhouse` plugin to Flyway's `drivers` directory:

```bash
wget https://github.com/ClickHouse/clickhouse-java/releases/download/v0.9.8/clickhouse-jdbc-0.9.8-all.jar \
  -O flyway-10.22.0/drivers/clickhouse-jdbc-0.9.8-all.jar

wget https://repo1.maven.org/maven2/org/flywaydb/flyway-database-clickhouse/10.22.0/flyway-database-clickhouse-10.22.0.jar \
  -O flyway-10.22.0/drivers/flyway-database-clickhouse-10.22.0.jar
```

## Flyway Configuration

Create `flyway.conf`:

```text
flyway.url=jdbc:clickhouse://localhost:8123/analytics
flyway.user=default
flyway.password=
flyway.locations=filesystem:./migrations
flyway.table=schema_history
```

## Writing Migration Scripts

```bash
mkdir -p migrations
```

### V1 - Create Events Table

```sql
-- migrations/V1__Create_events_table.sql
CREATE TABLE IF NOT EXISTS events (
    ts          DateTime,
    user_id     String,
    event_type  LowCardinality(String),
    value       Float64 DEFAULT 0
)
ENGINE = MergeTree()
ORDER BY (user_id, ts)
PARTITION BY toYYYYMM(ts);
```

### V2 - Add Index

```sql
-- migrations/V2__Add_event_type_index.sql
ALTER TABLE events
ADD INDEX idx_event_type (event_type) TYPE bloom_filter GRANULARITY 3;
```

### V3 - Add New Column

```sql
-- migrations/V3__Add_country_column.sql
ALTER TABLE events
ADD COLUMN IF NOT EXISTS country LowCardinality(String) DEFAULT '';
```

## Running Migrations

```bash
flyway -configFiles=flyway.conf migrate
```

## Checking Status

```bash
flyway -configFiles=flyway.conf info
```

Output:

```text
+----------+---------+------------------------------+--------+---------------------+----------+
| Category | Version | Description                  | Type   | Installed On        | State    |
+----------+---------+------------------------------+--------+---------------------+----------+
| Versioned| 1       | Create events table          | SQL    | 2026-03-31 10:00:00 | Success  |
| Versioned| 2       | Add event type index         | SQL    | 2026-03-31 10:01:00 | Success  |
| Versioned| 3       | Add country column           | SQL    | 2026-03-31 10:02:00 | Success  |
+----------+---------+------------------------------+--------+---------------------+----------+
```

## Maven Integration

```xml
<plugin>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-maven-plugin</artifactId>
  <configuration>
    <url>jdbc:clickhouse://localhost:8123/analytics</url>
    <user>default</user>
    <locations>
      <location>filesystem:src/main/resources/db/migration</location>
    </locations>
  </configuration>
  <dependencies>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-database-clickhouse</artifactId>
      <version>10.22.0</version>
    </dependency>
    <dependency>
      <groupId>com.clickhouse</groupId>
      <artifactId>clickhouse-jdbc</artifactId>
      <version>0.9.8</version>
      <classifier>all</classifier>
    </dependency>
  </dependencies>
</plugin>
```

## Summary

Flyway works well with ClickHouse via the JDBC driver and provides a robust, enterprise-grade migration workflow. Its version tracking and info commands make it easy to manage schema history across development, staging, and production environments.
