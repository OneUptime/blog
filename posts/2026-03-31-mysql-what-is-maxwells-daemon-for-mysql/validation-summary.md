# Validation Summary: What Is Maxwell's Daemon for MySQL

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- MySQL (binary log replication, CDC)
- Maxwell's Daemon (Zendesk open-source CDC tool)
- Apache Kafka
- Amazon Kinesis
- RabbitMQ
- Redis
- Docker
- systemd

## Sources Consulted
- Maxwell GitHub repository: https://github.com/zendesk/maxwell
- Maxwell official documentation (quickstart, configuration reference, compatibility, filtering, data format)
- Maxwell releases page: https://github.com/zendesk/maxwell/releases
- Maxwell schema SQL (maxwell_schema.sql) for position table verification
- Maxwell source code (MaxwellConfig.java) for CLI flag verification
- Docker Hub zendesk/maxwell image

## Issues Found

1. **MySQL version requirement was incorrect**: The post stated "MySQL 5.5+" but Maxwell officially supports MySQL 5.1, 5.5, 5.6, 5.7, and 8. Changed to "MySQL 5.1+" to match official compatibility documentation.

2. **Maxwell version was outdated**: The post used v1.40.0 (released 2023-04-02) in the download example while labeling it as "the latest release." Updated to v1.44.0 (released 2025-06-25), which is the actual latest release.

3. **UPDATE event example showed incomplete data**: The stdout output example for an UPDATE event showed `"data":{"id":42,"status":"shipped"}` with only the primary key and changed column. With `binlog_row_image=FULL` (which the post recommends configuring), the `data` field contains a complete copy of the row including all columns. Fixed to include all columns from the original INSERT example: `"data":{"id":42,"customer_id":7,"amount":99.99,"status":"shipped"}`.

## Review Notes
- The list of output targets (Kafka, Kinesis, RabbitMQ, Redis, stdout) is correct but not exhaustive. Maxwell also supports file, SQS, SNS, NATS, Google Cloud Pub/Sub, and BigQuery producers. The post does not claim to list all targets, so this is not an error.
- The `--init_position` flag carries a warning in official docs: "This is a dangerous option... Maxwell must have already 'visited' that binlog position." The post does not mention this caveat, which could be added in a future revision.
- The comparison table with Debezium is a reasonable high-level summary. Debezium has expanded beyond just Kafka Connect sinks in recent versions, but the comparison captures the typical deployment difference accurately.
- All SQL statements, CLI flags, filter syntax, configuration directives, and Docker commands were verified as correct against official documentation.
