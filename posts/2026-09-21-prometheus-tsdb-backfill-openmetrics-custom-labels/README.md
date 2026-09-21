# How to Backfill Prometheus TSDB from OpenMetrics and Preserve Custom Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Migration, Data Validation

Description: Generate historical OpenMetrics samples with their complete label sets, create TSDB blocks with promtool, and verify labels before importing them.

A file-based TSDB backfill does not pass through the usual scrape pipeline. Labels normally supplied by target discovery, relabeling, or a scrape job are not magically reconstructed from the historical file. Include the intended final series identity in every input sample.

This example uses Prometheus and promtool 3.13.2 with classic float samples in OpenMetrics 1.0 format. Stage and inspect the generated blocks before introducing them into an existing TSDB.

## Define the final label set

Suppose dashboards select:

```promql
checkout_requests_total{
  job="checkout",
  instance="checkout-1",
  environment="production",
  region="eu-west-1"
}
```

Every historical sample must carry those labels if it should belong to that series. A different or missing `instance` creates a different time series. Use labels matching the stored historical identity, including any intended results of metric relabeling; do not blindly copy a present-day target inventory onto older data.

Keep labels bounded and distinguish identity from provenance. Adding `import_batch="2026-09-21"` is convenient for tracking imports but also changes the series identity, so it will not merge into the original unlabeled series.

## Generate a small input fixture

Create a file with samples about one day old. These generated timestamps are Unix seconds, as required by OpenMetrics, not Prometheus text-format milliseconds:

```bash
python - <<'PY' > history.om
import time

start = int(time.time()) - 86400
labels = '{job="checkout",instance="checkout-1",environment="production",region="eu-west-1"}'
print("# HELP checkout_requests Completed checkout requests.")
print("# TYPE checkout_requests counter")
for offset, value in [(0, 120), (60, 130), (120, 145)]:
    print(f"checkout_requests_total{labels} {value} {start + offset}")
print("# EOF")
PY
```

Replace the generated values with real historical data before a real import. Preserve each series' timestamp ordering and reconcile duplicate label-set/timestamp pairs before block creation. A seconds-versus-milliseconds mistake can put data thousands of years away from the intended range. [OpenMetrics sample timestamps](https://prometheus.io/docs/specs/om/open_metrics_spec/)

Include explicit timestamps for every backfilled sample. Live exporters usually let Prometheus assign scrape time, but a historical file must state when each measurement occurred.

## Create blocks in a fresh staging directory

Check the tool and command syntax:

```bash
promtool --version
promtool tsdb create-blocks-from openmetrics --help
```

Then run the documented backfill command:

```bash
mkdir backfill-blocks
promtool tsdb create-blocks-from openmetrics history.om backfill-blocks
promtool tsdb list backfill-blocks
```

Use a new directory for each attempt; otherwise, a retry can leave multiple generated block sets and make import bookkeeping ambiguous. The command normally creates blocks spanning two-hour windows, which Prometheus can compact later. [Prometheus backfilling documentation](https://prometheus.io/docs/prometheus/latest/storage/#backfilling-from-openmetrics-format)

Read the block list and confirm the sample count, series count, and timestamp range. The three example samples should remain one series; verify their exact labels through the initialized test copy below. Record the input checksum and generated block identifiers in your operational migration record so the same block set is not imported twice.

This process does not invoke a scrape job or its `metric_relabel_configs`. It also does not replay historical ingestion through recording rules automatically. Treat rule backfilling as a separate operation when derived series are required.

## Verify through an isolated Prometheus

Before touching the production data directory, start an isolated Prometheus against a copy of the staged blocks. A minimal test configuration is:

```yaml
scrape_configs: []
```

Save it as `backfill-check.yml`, then use a separate web port:

```bash
set -euo pipefail
test ! -e backfill-check-data
cp -a backfill-blocks backfill-check-data
prometheus --config.file=backfill-check.yml \
  --storage.tsdb.path=backfill-check-data \
  --storage.tsdb.retention.time=30d \
  --web.listen-address=127.0.0.1:19091
```

Query the example series over its historical time range, not just at the current instant. An instant query now may return nothing because the samples are a day old. Compare the complete label set returned by the API or expression browser with the intended selector.

Stop the test server with Ctrl-C, then inspect its initialized copy:

```bash
promtool tsdb dump backfill-check-data > backfill-dump.txt
```

Confirm the metric name, every custom label, values, and timestamps in the dump. Running `tsdb dump` directly against fresh block-only output can fail because the WAL directory has not been initialized; the disposable server copy supplies a complete TSDB layout. Import the untouched original block set, since the test server may compact or otherwise manage its copy.

## Respect head overlap and retention

Prometheus warns that backfilling the most recent three hours is unsafe because it can overlap the mutable head block. Exclude that range and inspect existing blocks for other overlapping samples before importing. Do not assume “the same values” makes duplicate imports harmless. [Backfill limitations](https://prometheus.io/docs/prometheus/latest/storage/#backfilling-from-openmetrics-format)

Retention still applies to imported data. Historical blocks outside the configured time or size budget can be removed after they are loaded. Set and review the retention plan before migration rather than interpreting later deletion as lost labels.

The OpenMetrics backfill path does not support native histograms or staleness markers. If the source contains them, choose another supported migration approach instead of coercing them into ordinary float samples.

For production import, use your TSDB maintenance and backup procedure, moving only the reviewed generated block directories into the configured storage path. Keep ownership and permissions compatible with the Prometheus process. Preserve the pre-import state or snapshot needed for rollback.

If labels or timestamps are wrong, discard the staged attempt and regenerate it from the corrected source mapping. Repairing an import before it reaches production is substantially easier than separating incorrect samples from a live TSDB after compaction.
