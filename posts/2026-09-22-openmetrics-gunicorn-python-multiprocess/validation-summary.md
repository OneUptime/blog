# Validation Summary: How to Aggregate OpenMetrics Across Gunicorn Workers with Python Multiprocess Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python and WSGI
- prometheus-client 0.26.0 and multiprocess metric storage
- Prometheus counters, gauges, histograms, and PromQL
- OpenMetrics content negotiation and gzip compression
- Gunicorn worker lifecycle and configuration
- Unix shell and curl

## Sources Consulted
- [Python client multiprocess documentation](https://prometheus.github.io/client_python/multiprocess/): deployment directory, registry isolation, unsupported features, gauge modes, and worker death hook.
- [Python client WSGI exporter documentation](https://prometheus.github.io/client_python/exporting/http/wsgi/): WSGI integration and compression.
- [Version 0.26.0 multiprocess implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/multiprocess.py): aggregation and selective live-gauge file removal.
- [Version 0.26.0 registry implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/registry.py): support_collectors_without_names constructor argument.
- [Version 0.26.0 exposition implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py): Accept and Accept-Encoding processing.
- [Version 0.26.0 metrics implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/metrics.py): Counter, Gauge, and track_inprogress APIs.
- [Version 0.26.0 storage implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/values.py): environment-selected storage and per-process files.
- [Gunicorn configuration source](https://github.com/benoitc/gunicorn/blob/master/gunicorn/config.py), installed Gunicorn 26.2.0 configuration source, and gunicorn --help: CLI options and child_exit signature.
- [Gunicorn 26.2.0 arbiter source](https://github.com/benoitc/gunicorn/blob/26.2.0/gunicorn/arbiter.py): worker reaping, death hook execution, and replacement management.
- [PEP 3333](https://peps.python.org/pep-3333/): WSGI callable, response iterable, and response lifecycle.
- [Prometheus rate documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate): counter reset handling.
- Local curl --help all: fail, silent, show-error, dump-header, and header options.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The linked technical resources resolve to the intended documentation and versioned implementation. Gunicorn documentation pages could not be retrieved through the browsing tool, so the official source, installed package source, and CLI help were used instead.
- Installed prometheus-client 0.26.0 and Gunicorn 26.2.0 in an isolated Python 3.13 environment. Extracted and compiled both Python snippets directly from the post, then ran them with three Gunicorn workers on an available loopback port using a fresh temporary metrics directory.
- Thirty successful /work requests produced orders_completed_total 30.0 and orders_in_progress 0.0. Ten successive OpenMetrics scrapes retained those values and returned the expected content type and final # EOF. Ordinary text exposition and gzip negotiation also passed.
- Sent SIGTERM to one test worker and waited for Gunicorn to replace it. Verified that its livesum gauge file disappeared, its counter file remained, and the total stayed at 30 before increasing to 31 after one additional operation. The test server was stopped and its temporary directory removed afterward.
- The worker test checks idle gauge cleanup and retained counter history; it does not simulate terminating an operation while its gauge is nonzero. Live-mode cleanup and histogram retention were additionally verified in the versioned source.
- The registry keyword is valid for the explicitly pinned client version. Gunicorn is unpinned in the post; the runtime check used 26.2.0. No deprecated APIs were identified in the examples.
- The short synchronous operation usually finishes between scrapes; observing a nonzero in-progress gauge would require longer-running work. The existing WSGI lifecycle caveat accurately describes this instrumentation boundary.
