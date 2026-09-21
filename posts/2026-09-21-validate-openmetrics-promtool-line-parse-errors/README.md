# How to Validate OpenMetrics with promtool and Locate Line-Level Parse Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Data Validation, Observability

Description: Use promtool for its supported checks, pair it with an OpenMetrics parser, and narrow malformed payloads to the metric family and line.

`promtool check metrics` is useful, but a successful result is not a complete OpenMetrics 1.0 validation. In Prometheus 3.13.2, that command uses the Prometheus text-format linter. It can reject valid OpenMetrics-specific types and can accept text that lacks OpenMetrics's required EOF marker.

Use a format-aware sequence: capture the exact HTTP response, check OpenMetrics with an OpenMetrics parser, use promtool for the checks it supports, and finish with the actual Prometheus scraper. The command implementation is the authoritative boundary for what `check metrics` does. [Prometheus v3.13.2 promtool source](https://github.com/prometheus/prometheus/blob/v3.13.2/cmd/promtool/main.go)

## Capture the response without changing it

Save headers and body separately:

```bash
set -euo pipefail
curl --fail --silent --show-error \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -D metrics.headers \
  -o metrics.om \
  http://127.0.0.1:8000/metrics

cat metrics.headers
nl -ba metrics.om
```

Confirm a successful HTTP response and an `application/openmetrics-text` content type with the intended version. Check the final `# EOF` line and preserve the original bytes while investigating. An endpoint that sends Prometheus text while claiming OpenMetrics needs an encoder or header fix, not a local validator workaround. [OpenMetrics 1.0](https://prometheus.io/docs/specs/om/open_metrics_spec/)

## Run an OpenMetrics-aware parser

With `prometheus-client==0.26.0` installed, save this as `check_openmetrics.py`:

```python
from pathlib import Path
import sys

from prometheus_client.openmetrics.parser import text_fd_to_metric_families

path = Path(sys.argv[1])
position = 0


def numbered_lines(handle):
    global position
    for position, line in enumerate(handle, 1):
        yield line


try:
    with path.open(encoding="utf-8", errors="strict", newline="") as handle:
        families = list(text_fd_to_metric_families(numbered_lines(handle)))
except UnicodeDecodeError as error:
    raise SystemExit(f"Invalid UTF-8 (buffered decoding; line unavailable): {error}")
except ValueError as error:
    raise SystemExit(f"Parse failed at or before line {position}: {error}")

print(f"Parsed {len(families)} metric families")
```

Run:

```bash
python check_openmetrics.py metrics.om
```

The reported position is where the iterator had reached when failure surfaced. A family-wide error may be detected on the next family's metadata or at EOF, so inspect the preceding family too. The Python parser itself documents compatibility limits relative to the main Go parser. [Python OpenMetrics parser](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/openmetrics/parser.py)

Use the line number to narrow the file:

```bash
nl -ba metrics.om | sed -n '35,55p'
```

Replace the range with the relevant lines. Check unterminated label quotes, invalid escapes, duplicate series, metadata arriving after samples, and histogram bucket/count relationships. Keep complete metric families when reducing a fixture; deleting their HELP or TYPE lines can change the meaning of the remaining samples.

## Apply promtool to the appropriate format

Record the tool version:

```bash
promtool --version
```

If the endpoint also supports traditional text, request that representation and lint it:

```bash
set -euo pipefail
curl --fail --silent --show-error \
  -H 'Accept: text/plain; version=0.0.4' \
  -o metrics.prom http://127.0.0.1:8000/metrics
promtool check metrics < metrics.prom
```

This can catch naming and consistency problems in the legacy representation. It does not retroactively validate the OpenMetrics response. Distinguish parser failures from lint complaints about conventions: a metric can parse while still using a confusing name or type. [promtool command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/)

Do not remove OpenMetrics metadata or exemplars until `check metrics` passes and then declare the original payload valid. You would be testing a different document.

## Verify with the deployed scraper

For a local exporter on port 8000, create a temporary Prometheus configuration:

```yaml
global:
  scrape_interval: 5s
scrape_configs:
  - job_name: openmetrics-check
    scrape_protocols: [OpenMetricsText1.0.0]
    static_configs:
      - targets: ["127.0.0.1:8000"]
```

Check configuration syntax, then start an isolated server with a fresh data directory and a separate listen port:

```bash
promtool check config prometheus-check.yml
prometheus --config.file=prometheus-check.yml \
  --storage.tsdb.path=./prometheus-check-data \
  --web.listen-address=127.0.0.1:19090
```

These commands assume both processes run on the same host. A container's loopback address points to that container, so adapt target networking if using Docker.

Inspect the target page and `up{job="openmetrics-check"}` after several scrapes. A value of one plus the expected metric samples verifies the deployed scraper accepted this endpoint. Prometheus 3 also checks response content types more strictly than older releases. [Prometheus 3 migration guidance](https://prometheus.io/docs/prometheus/latest/migration/)

Finally, fix the exporter and keep the smallest failing fixture as a regression test. Stop the temporary server when finished. If only the diagnostic parser passes, leave the incident open until the real scrape succeeds; transport negotiation, parsing, and ingestion are distinct stages with different failure messages.
