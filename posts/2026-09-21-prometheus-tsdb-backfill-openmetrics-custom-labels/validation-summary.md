# Validation Summary: How to Backfill Prometheus TSDB from OpenMetrics and Preserve Custom Labels

## Status
validated

## Post Type
Tutorial / operational migration guide.

## Technologies Covered
- Prometheus and promtool 3.13.2
- Prometheus TSDB blocks, WAL, compaction, and retention
- OpenMetrics 1.0 float samples and counter naming
- PromQL and the Prometheus HTTP query API
- Python 3, Bash, and YAML configuration

## Sources Consulted
- [Prometheus 3.13.2 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.2), including the official Darwin ARM64 binaries used for execution checks.
- [Prometheus storage and OpenMetrics backfilling](https://prometheus.io/docs/prometheus/latest/storage/#backfilling-from-openmetrics-format).
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/).
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/).
- [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/), including scrape and metric relabeling configuration.
- [Promtool command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/) and the installed 3.13.2 command help.
- [Prometheus server command reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/).
- [PromQL querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/), including historical evaluation and lookback behavior.
- [Prometheus 3.13.2 backfill implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/cmd/promtool/backfill.go).
- [Prometheus 3.13.2 TSDB command implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/cmd/promtool/tsdb.go), including dump formatting and backfill input handling.
- [Python time.time documentation](https://docs.python.org/3/library/time.html#time.time).
- [Python formatted string literals](https://docs.python.org/3/reference/lexical_analysis.html#f-strings).

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged during this review; its existing workspace changes were preserved.
- Executed the article's Python fixture with Python 3.13.1 and the official Prometheus/promtool 3.13.2 binaries in a disposable directory outside the repository.
- Verified version output and OpenMetrics backfill command help. The minimal YAML passed `promtool check config`, and the server accepted all shown startup flags.
- Block creation and listing succeeded with three samples and one series. A historical HTTP range query returned values 120, 130, and 145 at the exact input timestamps, with the metric name and all four intended labels intact.
- Reproduced the missing-WAL error when dumping fresh block-only output. After starting and stopping the isolated server against a copy, the dump succeeded and contained all three original samples.
- OpenMetrics input timestamps and HTTP API timestamps use seconds; the default TSDB dump and numeric block-list timestamps use milliseconds. The dump values were checked against the input after this conversion.
- The two-hour duration describes the backfill partitioning windows. A sparse fixture can produce a block whose listed minimum-to-maximum time span is shorter; this run listed 2m0.001s. If the fixture crosses a window boundary, it can produce multiple blocks containing the same series identity.
- Confirmed that series identity depends on the metric name and complete label set, and that this file import does not execute discovery, scrape relabeling, metric relabeling, or recording rules. Version 3.13.2 also offers an explicit `--label` option; embedding the final labels in the file remains valid for the command shown.
- The documented head-overlap exclusion, duplicate-import precautions, retention behavior, separate recording-rule backfill, and limitations on native histograms and staleness markers are consistent with the scoped OpenMetrics backfill procedure.
- The pinned 3.13.2 release exists and was tested directly; the article does not claim it is the latest release. The Python command assumes `python` resolves to Python 3 with f-string support.
- The specification and storage links resolve to the intended official resources. Production import, retention deletion, and rollback were reviewed against documentation but were not exercised against a production TSDB.
