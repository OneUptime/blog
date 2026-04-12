# Validation Summary: How to Use Maxwell's Daemon for MySQL CDC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (binary logging, replication configuration)
- Maxwell's Daemon (CDC tool by Zendesk)
- Apache Kafka (as a downstream producer target)
- Prometheus (metrics monitoring)
- Java (runtime requirement)

## Sources Consulted
- Maxwell's Daemon official documentation — https://maxwells-daemon.io/
- Maxwell configuration reference — https://maxwells-daemon.io/config/
- Maxwell producers documentation — https://maxwells-daemon.io/producers/
- Maxwell filtering documentation — https://maxwells-daemon.io/filtering/
- Maxwell monitoring documentation — https://maxwells-daemon.io/monitoring/
- Maxwell GitHub repository — https://github.com/zendesk/maxwell

## Issues Found

### 1. Wrong option for Kafka partitioning by primary key
- **What was wrong:** The post used `--kafka_partition_hash=primary_key` to partition Kafka messages by primary key. The `kafka_partition_hash` option controls the hash *function* (valid values: `hashCode`, `murmurhash3`), not what data to partition on.
- **What was changed:** Replaced `--kafka_partition_hash=primary_key` with `--producer_partition_by=primary_key` in both the command and the explanatory text.
- **Why:** `producer_partition_by` is the correct option for selecting the partition key (database, table, primary_key, etc.).

### 2. Incorrect filter evaluation order
- **What was wrong:** The filter was written as `include: myapp.orders, include: myapp.customers, exclude: myapp.*`. Maxwell evaluates filters in order and the last matching rule wins. With this order, the `exclude: myapp.*` rule would be the last match for all tables in `myapp`, effectively excluding everything — including orders and customers.
- **What was changed:** Reversed the order to `exclude: myapp.*, include: myapp.orders, include: myapp.customers` in both the command-line example and the config file example.
- **Why:** With the corrected order, the specific includes come after the broad exclude, so they override it for the targeted tables.

### 3. Invalid `metrics_type` value
- **What was wrong:** The post used `metrics_type=prometheus`. The valid values for `metrics_type` are `slf4j`, `jmx`, `http`, `datadog`, and `graphite`. There is no `prometheus` value.
- **What was changed:** Changed `metrics_type=prometheus` to `metrics_type=http`.
- **Why:** The `http` metrics type exposes a Prometheus-compatible endpoint at `/prometheus`.

### 4. Wrong Prometheus metrics endpoint path
- **What was wrong:** The post referenced `http://localhost:8080/metrics` as the Prometheus scrape URL.
- **What was changed:** Changed to `http://localhost:8080/prometheus`.
- **Why:** Maxwell's HTTP metrics server exposes Prometheus-format metrics at the `/prometheus` path, not `/metrics`.

### 5. Incorrect Java version requirement
- **What was wrong:** The post stated "Java 11 or later" as a requirement. Maxwell's build configuration targets Java 8 compatibility (`maven.compiler.source=1.8`).
- **What was changed:** Changed to "Java 8 or later".
- **Why:** Java 8 is the documented minimum; while Java 11+ works fine, stating 11 as the minimum is inaccurate and could cause confusion for users running Java 8.

## Review Notes
- The download URL references Maxwell v1.41.2 which may not be a current release. The URL pattern and repository path (zendesk/maxwell) are correct. Readers should check https://github.com/zendesk/maxwell/releases for the latest version.
- The MySQL configuration, user grants, JSON output format, and general architectural claims about Maxwell are all accurate.
- The comparison with Debezium in the summary is fair — Maxwell is indeed lighter-weight and does not require Kafka Connect infrastructure.
