# How to Use Liquibase with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Liquibase, Schema Migration, DevOps, Database

Description: Learn how to set up Liquibase for ClickHouse schema management using XML or SQL changelogs with the official ClickHouse Liquibase extension.

---

Liquibase is a database-agnostic schema migration tool that uses changelog files to track and apply changes. With the ClickHouse Liquibase extension, you can manage ClickHouse schemas with the same tooling used for relational databases.

## Installation

```bash
# Download Liquibase CLI
wget https://github.com/liquibase/liquibase/releases/download/v4.25.0/liquibase-4.25.0.tar.gz
tar -xf liquibase-4.25.0.tar.gz -C /opt/liquibase

# Add to PATH
export PATH=$PATH:/opt/liquibase
```

## Installing the ClickHouse Extension

Download the extension JAR into Liquibase's `lib` directory:

```bash
wget https://github.com/MEDIARITHMICS/liquibase-clickhouse/releases/latest/download/liquibase-clickhouse.jar \
  -O /opt/liquibase/lib/liquibase-clickhouse.jar
```

## Configuration

Create `liquibase.properties`:

```text
url=jdbc:clickhouse://localhost:8123/analytics
username=default
password=
changeLogFile=changelog.xml
driver=com.clickhouse.jdbc.ClickHouseDriver
classpath=lib/clickhouse-jdbc-all.jar
```

## Writing XML Changelogs

Create a file named `changelog.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.25.xsd">

    <changeSet id="1" author="analyst">
        <sql>
            CREATE TABLE IF NOT EXISTS page_views (
                ts       DateTime,
                user_id  String,
                page     String,
                duration UInt32 DEFAULT 0
            )
            ENGINE = MergeTree()
            ORDER BY (user_id, ts)
            PARTITION BY toYYYYMM(ts)
        </sql>
        <rollback>DROP TABLE IF EXISTS page_views</rollback>
    </changeSet>

    <changeSet id="2" author="analyst">
        <sql>
            ALTER TABLE page_views
            ADD COLUMN IF NOT EXISTS country LowCardinality(String) DEFAULT ''
        </sql>
        <rollback>
            ALTER TABLE page_views DROP COLUMN IF EXISTS country
        </rollback>
    </changeSet>

</databaseChangeLog>
```

## Applying Migrations

```bash
liquibase update
```

## Checking Status

```bash
liquibase status
```

## Rolling Back

```bash
# Roll back last N changes
liquibase rollback-count --count=1

# Roll back to a tag
liquibase tag --tag=v1.0
liquibase rollback --tag=v1.0
```

## Generating a Diff

Compare two schemas:

```bash
liquibase diff \
  --referenceUrl=jdbc:clickhouse://staging-host:8123/analytics \
  --referenceUsername=default
```

## SQL Changelog Mode

For teams preferring plain SQL files:

```sql
-- changelog.sql
--liquibase formatted sql

--changeset analyst:1
CREATE TABLE IF NOT EXISTS metrics (
    ts    DateTime,
    host  String,
    value Float64
)
ENGINE = MergeTree()
ORDER BY (host, ts);

--rollback DROP TABLE IF EXISTS metrics;
```

## Summary

Liquibase with the ClickHouse extension provides a full-featured schema migration workflow including rollbacks, diffs, and changelog formats (XML, YAML, JSON, SQL). It fits well in enterprise Java environments already using Liquibase for other databases.
