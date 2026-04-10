# Validation Summary: How to Sync Redis Data to a Data Warehouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (keyspace notifications, RDB snapshots, pub/sub)
- Apache Kafka / Kafka Connect
- jaredpetersen/kafka-connect-redis connector
- Python (redis-py, psycopg2)
- rdbtools (RDB snapshot parser)
- PostgreSQL (as warehouse target example)

## Sources Consulted
- jaredpetersen/kafka-connect-redis GitHub repository (https://github.com/jaredpetersen/kafka-connect-redis) — verified connector class name, config properties, and Confluent Hub availability
- Redis official documentation on keyspace notifications (https://redis.io/docs/manual/keyspace-notifications/) — verified CONFIG SET notify-keyspace-events flags, channel naming, and pmessage format
- rdbtools PyPI page (https://pypi.org/project/rdbtools/) and GitHub repository (https://github.com/sripathikrishnan/redis-rdb-tools) — verified package name and CLI usage
- redis-py documentation — verified Redis client API usage
- psycopg2 documentation — verified cursor.execute() parameterized query syntax

## Issues Found

1. **Incorrect Kafka connector class name**: The connector class was listed as `com.github.jaredpetersen.kafkaconnectredis.source.RedisSourceConnector` but the correct package prefix is `io.github.jaredpetersen`, not `com.github.jaredpetersen`. Fixed to `io.github.jaredpetersen.kafkaconnectredis.source.RedisSourceConnector`.

2. **Description mentions Debezium but post does not cover it**: The description line stated "using Kafka Connect, Debezium, or custom scripts" but Debezium is never discussed in the post. Changed "Debezium" to "RDB snapshots" to accurately reflect the three approaches covered (Kafka Connect, RDB snapshots, custom scripts).

3. **Incomplete data type enumeration**: The text under "Handling Data Types" listed "strings, hashes, sets, and sorted sets" but omitted lists, even though the mapping table immediately below includes Redis Lists. Added "lists" to the enumeration.

## Review Notes
- The `rdbtools` package (`pip install rdbtools`) is correct but effectively unmaintained since June 2020 (last release: 0.1.15). The recommended install includes the companion package `python-lzf` for faster parsing (`pip install rdbtools python-lzf`). This is not an error but could be noted for readers.
- The Python ETL script uses `r.keys("counter:*")` which is a blocking O(N) operation. In production with large keyspaces, `SCAN` is preferred. This is a best-practice consideration rather than a technical error, and the post is framed as a simple example.
- The `import json` in the Python ETL script is unused, but this is a minor style issue, not a technical error.
