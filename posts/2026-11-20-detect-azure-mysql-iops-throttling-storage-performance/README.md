# Detect Azure MySQL IOPS Throttling and Tune Storage Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Performance, Troubleshooting

Description: Investigate Azure MySQL storage saturation with correctly aggregated I/O metrics, identify the limiting capacity, and validate an IOPS change against application outcomes.

An import slows down, ordinary reads become sluggish, and CPU usage leaves plenty of apparent headroom. Storage may be the bottleneck, but a busy disk chart alone does not prove throttling.

Build the diagnosis from three pieces of evidence: the server's configured limits, storage demand during the incident, and the application's response. Then change the limiting resource or reduce the work causing the pressure.

## Distinguish capacity, rate, and space

IOPS means input/output operations per second. It describes an operation rate, not the number of gigabytes stored. Throughput measures bytes transferred per second, while latency measures how long operations take. A workload can be constrained by different aspects of storage performance.

Azure MySQL supports pre-provisioned IOPS and autoscale IOPS. The former uses a configured allocation; the latter adjusts with demand. Autoscaling does not remove the maximum supported by the compute size. Microsoft describes these choices in [Storage IOPS](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-storage-iops) and the [service-tier limits](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage).

Storage autogrow is a separate setting that increases capacity when free space runs low. Enabling it does not mean autoscale IOPS is enabled. Avoid increasing storage size simply to experiment with performance: Azure permits storage growth but not shrinking the same server's storage afterward.

Record the following before changing anything:

| Configuration | Why it matters |
|---|---|
| Compute tier and exact size | Determines the supported IOPS ceiling |
| Storage type and size | Establishes the storage configuration being tested |
| Current IOPS mode and allocation | Shows whether a manually selected limit applies |
| Free space and growth settings | Separates capacity exhaustion from rate saturation |
| Recent workload or configuration changes | Identifies what changed before the slowdown |

Keep the test scoped to your actual storage product and region. Do not copy limits from another Azure database service or assume a preview storage option behaves like your current deployment.

## Capture the configuration and metric window

The commands below are source-reviewed for **Azure CLI 2.80.0**. They require an authenticated account with read access to the server and its metrics. Replace the resource names and the illustrative UTC time window, and verify the selected subscription.

```bash
set -euo pipefail
umask 077

MYSQL_RG='REPLACE_RESOURCE_GROUP'
MYSQL_SERVER='REPLACE_SERVER'
WINDOW_START='2026-11-19T08:00:00Z'
WINDOW_END='2026-11-19T10:00:00Z'

az mysql flexible-server show \
  --resource-group "$MYSQL_RG" --name "$MYSQL_SERVER" \
  --output json > mysql-storage-config.json

MYSQL_RESOURCE_ID=$(az mysql flexible-server show \
  --resource-group "$MYSQL_RG" --name "$MYSQL_SERVER" \
  --query id --output tsv)
test -n "$MYSQL_RESOURCE_ID"

az monitor metrics list-definitions \
  --resource "$MYSQL_RESOURCE_ID" \
  --output json > mysql-storage-metric-definitions.json
```

Review the `sku` and `storage` sections in the configuration file. Preserve the raw result so an omitted projection field cannot hide a relevant setting. The [Flexible Server command reference](https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server?view=azure-cli-latest) documents the inspection command.

Next collect the percentage and count separately because their supported aggregations differ:

```bash
az monitor metrics list \
  --resource "$MYSQL_RESOURCE_ID" \
  --metrics io_consumption_percent \
  --aggregation Average Maximum \
  --interval 1m --start-time "$WINDOW_START" --end-time "$WINDOW_END" \
  --output json > mysql-io-percent.json

az monitor metrics list \
  --resource "$MYSQL_RESOURCE_ID" \
  --metrics storage_io_count \
  --aggregation Total \
  --interval 1m --start-time "$WINDOW_START" --end-time "$WINDOW_END" \
  --output json > mysql-io-count.json
```

`io_consumption_percent` reports storage I/O consumption percentage. `storage_io_count` reports combined read/write operation counts, with Total aggregation at one-minute resolution. A complete minute containing 60,000 operations corresponds to an average of 1,000 operations per second, not 60,000 IOPS. The [MySQL monitoring reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference) defines these metrics.

The count metric is currently listed as unavailable for diagnostic-settings export to logs. Query it through Metrics when needed instead of assuming it will appear in an exported log table. Metric definitions on the actual resource remain the first compatibility check.

## Convert counts without hiding gaps

For the exact one-minute count query above, this Python 3 helper prints per-bucket average IOPS. Save it as `read_io_count.py` beside the JSON file and run `python3 read_io_count.py`. It reads a local file only.

```python
import json

with open("mysql-io-count.json", encoding="utf-8") as stream:
    payload = json.load(stream)

found = False
for metric in payload.get("value", []):
    if metric.get("name", {}).get("value") != "storage_io_count":
        continue
    found = True
    for series in metric.get("timeseries", []):
        for point in series.get("data", []):
            total = point.get("total")
            rate = "missing" if total is None else f"{total / 60:.2f}"
            print(point.get("timeStamp", "unknown-time"), rate)

if not found:
    raise SystemExit("storage_io_count was not returned; inspect the response")
```

A zero remains zero; a missing measurement stays visibly missing. No printed samples means no usable observations, not an idle disk. Do not reuse the divisor for five-minute or hourly buckets. Exclude incomplete edge buckets from rate comparisons, and remember that a one-minute average can conceal shorter bursts. The metric query flags are documented in the [Azure Monitor CLI reference](https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest).

## Decide whether the evidence supports throttling

Align the storage charts with application latency, throughput, queue depth, CPU, memory, and connection errors. Sustained I/O percentage near the available limit, flattening completed I/O, and rising latency under increasing demand support a saturation hypothesis.

That is stronger evidence than any one chart alone. A flat I/O count can also mean the workload stopped submitting requests. High latency can come from lock waits or network delays. High CPU on a Burstable server can be complicated by credit exhaustion. Keep those alternatives in the investigation.

Separate read-heavy and write-heavy triggers. A large scan can increase reads; a batch write, index build, or background flushing can increase writes. MySQL's [InnoDB disk-I/O documentation](https://dev.mysql.com/doc/refman/8.0/en/innodb-disk-io.html) explains that database I/O includes more than the application's immediate statement requests. Do not expect one SQL statement to correspond to one storage operation.

## Reduce waste before or alongside added capacity

Pause or slow a nonessential batch through its owning system, then compare latency at the reduced demand. Review queries that scan unnecessary rows, fetch unused columns, or repeatedly execute the same expensive read. Bound import concurrency so it does not consume all available storage capacity.

Use query plans to investigate access paths. Ordinary `EXPLAIN` and `EXPLAIN ANALYZE` are different: the latter executes the statement to collect measurements. Do not casually run it against an already saturated production workload. See [MySQL EXPLAIN](https://dev.mysql.com/doc/refman/8.0/en/explain.html).

If a configured IOPS allocation is the bottleneck and the compute size has headroom, evaluate additional provisioned IOPS or autoscale. If the compute-size ceiling is already limiting you, changing only the IOPS mode cannot create unlimited capacity. Evaluate a suitable compute change and its connection interruption.

## Rehearse one controlled IOPS change

For an approved **staging** server, the following switches to autoscale IOPS. Confirm that the variables refer to staging before running it, capture the previous configuration, and review the usage-based cost implications.

```bash
az mysql flexible-server update \
  --resource-group "$MYSQL_RG" --name "$MYSQL_SERVER" \
  --auto-scale-iops Enabled

az mysql flexible-server show \
  --resource-group "$MYSQL_RG" --name "$MYSQL_SERVER" \
  --query '{state:state,sku:sku,storage:storage}' \
  --output json
```

The flag and accepted values are present in the [Azure CLI 2.80.0 MySQL argument definitions](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli/azure/cli/command_modules/mysql/_params.py). Read back the resulting settings rather than assuming the requested update proves the effective configuration.

Replay a representative workload at comparable concurrency and data volume. Verify application latency and throughput, not just a lower utilization percentage. A changed limit can lower the percentage while the workload remains equally slow.

Keep the earlier mode and allocation in the change record. Returning to provisioned IOPS needs an explicit reviewed allocation that the workload can tolerate; it is not simply a switch to flip during a peak. Promote the change when the measured benefit, operating limits, and cost observation are clear, then retain an alert on sustained saturation together with user-visible latency.
