# Validation Summary: How to Use mongostat to Monitor MongoDB Performance in Real Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongostat CLI tool)
- WiredTiger storage engine (cache metrics)
- Python 3 (JSON parsing scripts)
- Prometheus / Grafana (monitoring integration)
- Percona MongoDB Exporter (Docker deployment)

## Sources Consulted
- MongoDB official documentation for mongostat: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB Database Tools source code (mongostat.go) for output format verification
- Percona MongoDB Exporter documentation: https://github.com/percona/mongodb_exporter

## Issues Found

1. **`command` column format described incorrectly**: The blog stated the `command` column shows `executed|failed`. The correct format is `local|replicated`, representing locally-issued commands vs. commands replicated from the primary. Fixed the description on the column guide.

2. **Multi-host output described as "column per host"**: The blog stated "Output includes a column per host" when using `--discover` or multiple `--host` values. In reality, mongostat outputs one row per host per polling interval, with `host`, `set`, and `repl` columns identifying each replica set member and its role (PRI, SEC, etc.). Fixed the description to accurately reflect row-per-host output.

## Review Notes
- The WiredTiger cache thresholds (dirty > 20%, used > 95%) are reasonable operational guidelines commonly cited in MongoDB performance tuning, though they are not hard limits from official documentation.
- The Python monitoring scripts are syntactically correct and properly handle the JSON output format of mongostat.
- The `--rowcount` and `--json` flags are correctly used throughout.
- The Percona MongoDB Exporter Docker command uses the correct default port (9216) and environment variable (`MONGODB_URI`).
- The awk example references a different filename (`/tmp/mongostat-output.txt`) than the capture command (which creates a timestamped file), which could confuse readers, but this is a stylistic choice rather than a technical error.
