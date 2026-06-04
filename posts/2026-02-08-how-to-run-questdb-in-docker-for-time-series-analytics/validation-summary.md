# Validation Summary: How to Run QuestDB in Docker for Time-Series Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- QuestDB
- QuestDB SQL
- InfluxDB Line Protocol (ILP)
- PostgreSQL wire protocol / psql
- Python QuestDB ingress client
- REST API with curl

## Sources Consulted
- QuestDB Docker deployment documentation: https://questdb.com/docs/deployment/docker/
- QuestDB configuration overview and Docker Compose configuration docs: https://questdb.com/docs/configuration/overview/ and https://questdb.com/docs/cookbook/operations/docker-compose-config/
- QuestDB ingestion configuration docs: https://questdb.com/docs/configuration/ingestion/
- QuestDB Python client documentation: https://questdb.com/docs/ingestion/clients/python/ and https://py-questdb-client.readthedocs.io/en/stable/sender.html
- QuestDB PostgreSQL wire protocol documentation: https://questdb.com/docs/query/pgwire/overview/
- QuestDB CREATE TABLE reference: https://questdb.com/docs/reference/sql/create-table/
- QuestDB SAMPLE BY documentation: https://questdb.com/docs/query/sql/sample-by/
- QuestDB LATEST ON documentation: https://questdb.com/docs/query/sql/latest-on/
- QuestDB REST API documentation: https://questdb.com/docs/query/rest-api/
- QuestDB data retention documentation: https://questdb.com/docs/operations/data-retention
- QuestDB monitoring/logging documentation for the minimal HTTP health server: https://questdb.com/docs/operations/logging-metrics/ and https://questdb.com/docs/operations/monitoring-alerting/
- Docker CLI and Docker Compose versions available locally: Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- Updated the QuestDB Docker image tag from `8.0.0` to `9.4.1`, matching the current version shown in official QuestDB Docker documentation at review time.
- Replaced outdated/incorrect Compose environment variables. `QDB_SHARED_WORKER_COUNT` and `QDB_CAIRO_COMMIT_LAG` were not aligned with current QuestDB configuration names, so they were changed to current shared worker and ILP/TCP commit interval variables.
- Replaced the `curl`-based Docker health check. The QuestDB image is minimal and should not assume `curl` is installed inside the container, so the health check now uses a Perl socket check against the documented minimal HTTP server on port `9003`.
- Fixed the psql connection command. Running `psql` via `docker exec` inside the QuestDB container assumes the container includes the PostgreSQL client. The post now uses a standard external psql client with the documented default user, password, and database name.
- Fixed the Python ingress client example. The current Python client documentation uses `Sender.from_conf(...)` or `Sender(Protocol.Tcp, host, port, ...)`; the old `Sender('localhost', 9009)` call was not current. The timestamp argument now uses `TimestampNanos.now()` as recommended by the Python client docs.
- Adjusted the REST `SAMPLE BY` example to include the sampled timestamp in the selected columns, matching the documented pattern for time-bucketed query results.

## Review Notes
- Docker image pulls could not be tested locally because Docker Hub returned an unauthenticated pull rate-limit error. The image tag and run syntax were verified against official QuestDB documentation instead.
- The `nc -q 0` examples are valid on common Linux netcat implementations, but `-q` is not portable to every netcat variant, including some BSD/macOS setups.
