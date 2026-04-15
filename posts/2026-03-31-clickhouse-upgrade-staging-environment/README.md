# How to Test ClickHouse Upgrades in a Staging Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Staging, Testing, DevOps

Description: Learn how to set up a staging environment to safely test ClickHouse version upgrades before applying them to production systems.

---

Testing ClickHouse upgrades in staging catches breaking changes, configuration issues, and performance regressions before they affect production. A proper staging test validates that your queries, data ingestion pipelines, and application integrations work correctly on the new version.

## Setting Up a Staging Environment

The staging environment should mirror production as closely as possible. Options include:

1. A separate ClickHouse instance on similar hardware
2. A Docker container with a copy of production data
3. A cloud-based clone of the production instance

### Docker-Based Staging

```bash
# Pull the target upgrade version
docker pull clickhouse/clickhouse-server:24.3

# Run with a copy of production config
docker run -d \
  --name clickhouse-staging \
  -p 19000:9000 \
  -p 18123:8123 \
  -v /data/clickhouse-staging:/var/lib/clickhouse \
  -v /etc/clickhouse-server:/etc/clickhouse-server \
  clickhouse/clickhouse-server:24.3
```

## Loading a Representative Data Sample

For large production databases, load a sample rather than the full dataset:

```sql
-- Connect to staging and create the table
CREATE TABLE staging.events AS production.events;

-- Insert a sample from the backup
INSERT INTO staging.events
SELECT * FROM production.events
SAMPLE 0.1  -- 10% sample
WHERE event_date >= today() - 30;
```

## Running the Compatibility Test Suite

Create a test script that runs your most important queries:

```bash
#!/bin/bash

CH_STAGING="clickhouse-client --host=localhost --port=19000"
FAIL=0

run_test() {
  local name="$1"
  local query="$2"
  if ${CH_STAGING} --query="${query}" > /dev/null 2>&1; then
    echo "PASS: ${name}"
  else
    echo "FAIL: ${name}"
    FAIL=1
  fi
}

# Test core queries
run_test "Basic SELECT" "SELECT count() FROM analytics.events;"
run_test "Aggregation" "SELECT toDate(event_time), count() FROM analytics.events GROUP BY 1 ORDER BY 1 DESC LIMIT 10;"
run_test "JOIN" "SELECT e.user_id, u.name FROM analytics.events e JOIN users u ON e.user_id = u.id LIMIT 10;"
run_test "Window function" "SELECT user_id, row_number() OVER (PARTITION BY user_id ORDER BY event_time) FROM analytics.events LIMIT 10;"

if [ $FAIL -eq 1 ]; then
  echo "Some tests failed!"
  exit 1
fi
echo "All tests passed"
```

## Checking Configuration Compatibility

```bash
# Test config validity with new version
docker exec clickhouse-staging clickhouse-extract-from-config --config-file /etc/clickhouse-server/config.xml --key path
```

Review settings that changed defaults:

```sql
-- Compare settings that differ from defaults
SELECT name, value, default, changed
FROM system.settings
WHERE changed = 1
ORDER BY name;
```

## Testing Ingestion Pipelines

Run a sample ingestion job pointing to staging:

```bash
# Test Kafka consumer against staging
export CLICKHOUSE_HOST=localhost
export CLICKHOUSE_PORT=19000
./run_kafka_consumer.sh --dry-run --limit=1000
```

## Performance Comparison

Compare query performance between old and new versions:

```sql
-- On production (old version)
SELECT count(), avg(query_duration_ms)
FROM system.query_log
WHERE query_start_time >= today() - 7
  AND type = 'QueryFinish'
  AND query NOT LIKE '%system%';

-- On staging (new version) - run same workload and compare
```

## Validating Upgrade Success Criteria

Define clear pass/fail criteria before upgrading:

```text
Pass criteria:
- All test queries return correct results
- Query performance within 10% of production baseline
- No ERROR messages in ClickHouse logs during test run
- All replication replicas sync correctly (for clusters)
- Configuration loads without warnings
```

## Summary

A staging environment for ClickHouse upgrades should run the target version with representative data, matching configuration, and a test suite of your most critical queries. Automate the test suite, compare performance metrics, and define explicit pass/fail criteria. Only promote an upgrade to production after staging validation is complete.
