# Validation Summary: How to Install and Configure QuestDB on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- QuestDB
- Java
- systemd
- InfluxDB Line Protocol
- QuestDB REST API
- PostgreSQL wire protocol
- SQL
- UFW

## Sources Consulted
- QuestDB Quick Start: https://questdb.com/docs/getting-started/quick-start/
- QuestDB systemd deployment guide: https://questdb.com/docs/deployment/systemd/
- QuestDB configuration overview: https://questdb.com/docs/configuration/overview/
- QuestDB HTTP server configuration: https://questdb.com/docs/configuration/http-server/
- QuestDB ILP/HTTP ingestion configuration: https://questdb.com/docs/configuration/ingestion/
- QuestDB PostgreSQL wire protocol configuration: https://questdb.com/docs/configuration/postgres-wire-protocol/
- QuestDB Cairo engine configuration: https://questdb.com/docs/configuration/cairo-engine/
- QuestDB WAL configuration: https://questdb.com/docs/configuration/wal/
- QuestDB REST API documentation: https://questdb.com/docs/query/rest-api/
- QuestDB ILP columnset type documentation: https://questdb.com/docs/ingestion/ilp/columnset-types/
- QuestDB SELECT, SAMPLE BY, and LATEST ON documentation: https://questdb.com/docs/query/sql/select/
- QuestDB GitHub latest release API: https://api.github.com/repos/questdb/questdb/releases/latest

## Issues Found
- The release download command assumed tags begin with `v` and used a non-existent `rt-linux-amd64` archive name. Updated the tag parsing and archive path to match the current QuestDB release asset format, such as `questdb-9.4.0-rt-linux-x86-64.tar.gz`.
- The install text described QuestDB as a single JAR while the instructions install the runtime archive. Updated the description and Java prerequisite wording to distinguish the bundled-runtime package from the no-JRE package.
- The systemd command started QuestDB in background mode under `Type=simple`. Added `-n` so the script keeps the Java process in the foreground for systemd.
- The commented direct Java command used the data directory as the module path and an outdated `-jar` shape. Updated it to use the QuestDB module entrypoint and `-d` for the root directory.
- The ports list omitted the current health/metrics endpoint and did not identify port 9009 as ILP over TCP. Updated the list to include port 9003 and clarify port 9009.
- The configuration snippet included `http.port`, `cairo.wal.enabled`, and `cairo.commit.lag`, which are not current documented keys. Removed or replaced them with current settings such as `cairo.wal.enabled.default` and `line.tcp.commit.interval.default`.
- The `cairo.root` explanation used an absolute path even though the documented setting is relative to the QuestDB root directory. Updated the example to `cairo.root=db`.
- The ILP examples sent integer-looking values without the `i` suffix. QuestDB ILP treats unsuffixed numbers as floating-point values, so the examples now suffix `LONG` values with `i`.

## Review Notes
QuestDB currently recommends ILP over HTTP for most client-library ingestion because it provides better error feedback and retries, while ILP over TCP remains available for compatibility and some high-throughput use cases. The post still shows TCP examples because they are simple to demonstrate with `nc`.
