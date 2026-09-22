# Validation Summary: How to Separate Custom Collectors from Python Multiprocess OpenMetrics

## Status

validated

## Post Type

Technical tutorial and deployment guide.

## Technologies Covered

- Python and its JSON, pathlib, threading, and environment APIs
- prometheus-client 0.26.0 custom collectors and multiprocess instrumentation
- Gunicorn and WSGI metrics routing
- Prometheus scrape configuration and OpenMetrics HTTP exposition
- curl, env, and atomic snapshot replacement

## Sources Consulted

- [Python client multiprocess documentation](https://prometheus.github.io/client_python/multiprocess/)
- [Python client custom collector API](https://prometheus.github.io/client_python/collector/custom/)
- [Python client HTTP exporter documentation](https://prometheus.github.io/client_python/exporting/http/)
- [prometheus-client 0.26.0 release](https://github.com/prometheus/client_python/releases/tag/v0.26.0)
- [Version 0.26.0 registry implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/registry.py)
- [Version 0.26.0 exposition implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py)
- [Version 0.26.0 environment selection and values implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/values.py)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus jobs, instances, and scrape health](https://prometheus.io/docs/concepts/jobs_instances/)
- [Python JSON documentation](https://docs.python.org/3/library/json.html)
- [Python atomic file replacement documentation](https://docs.python.org/3/library/os.html#os.replace)
- [curl command reference](https://curl.se/docs/manpage.html)
- Local macOS `env(1)` manual, checked for repeated `-u name` options.
- [Author profile](https://github.com/nawazdhandala), checked after its linked www.github.com URL redirected.

## Issues Found

- The standalone exporter's environment guard and launch command covered only `PROMETHEUS_MULTIPROC_DIR`. Version 0.26.0 still selects multiprocess metric storage when the deprecated `prometheus_multiproc_dir` variable is present. Updated the guard to reject either spelling and the launch command to unset both. This makes the stated requirement to launch without multiprocess mode hold for legacy environments too; it does not imply that a GaugeMetricFamily itself uses multiprocess storage.

## Review Notes

- Verified against the published 0.26.0 package in an isolated Python 3.13 environment. Both Python snippets compile, and the registry constructor accepts `support_collectors_without_names=True` in this version.
- Exercised the custom collector through a real local HTTP server and the documented curl flags. Confirmed OpenMetrics 1.0 content negotiation, the final EOF marker, expected queue samples, and absence of default process metrics or worker counters.
- Confirmed source failure behavior for a missing file, malformed JSON, invalid UTF-8, a non-object value, missing queues, negative depth, boolean depth, and fractional depth. Each response remained successful HTTP exposition, reported `queue_snapshot_up` as zero, and omitted queue depths. Restoring valid JSON restored the depth samples and source-status value.
- Registered the collector before creating its source file, confirming that registration does not require reading the snapshot. Explicit `describe()` advertises metric names for registration checks.
- Created counter data in two separate Python processes and invoked the exact WSGI metrics function against their shared directory. Verified a combined counter value of five, OpenMetrics output, and no queue metrics. This checks the multiprocess route and aggregation; a full Gunicorn deployment was not launched.
- Tested both environment guard spellings and executed the revised env command with both variables initially set.
- Parsed the YAML and checked its job, static target, and default /metrics path configuration against Prometheus documentation. A Prometheus server and promtool were not run.
- The article correctly relies on an existing application multiprocess setup and worker cleanup hook. The shared metrics directory must be set before importing instrumentation and cleared between application runs, as described by the linked documentation.
- The snapshot producer must use a same-filesystem rename for atomic replacement. Keeping its temporary file beside the destination is a practical way to meet that requirement.
- Source readability and valid values do not establish snapshot freshness; freshness monitoring remains a deployment consideration. Separate scrape health and source-status alerts are appropriate.
- The linked documentation and author profile resolved to the intended resources. The cited 0.26.0 release exists; the examples use supported APIs for that version.
