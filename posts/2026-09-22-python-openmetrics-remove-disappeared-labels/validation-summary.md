# Validation Summary: How to Remove Disappeared Label Sets from a Python OpenMetrics Exporter

## Status
validated

## Post Type
Technical troubleshooting guide with Python examples.

## Technologies Covered
- Python
- prometheus-client 0.26.0
- OpenMetrics exposition
- Prometheus collection, staleness, and historical queries
- Single-process and multiprocess exporters

## Sources Consulted
- Python client v0.26.0 metric implementation: https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/metrics.py
- Python client label documentation: https://prometheus.github.io/client_python/instrumenting/labels/
- Python client custom collector documentation: https://prometheus.github.io/client_python/collector/custom/
- Python client multiprocess limitations: https://prometheus.github.io/client_python/multiprocess/
- Python client counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Python client v0.26.0 HTTP content negotiation implementation: https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py
- Prometheus querying and staleness documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness

## Issues Found
- The reconciliation example reused the earlier Gauge but initialized `known` to an empty set. Running the examples in sequence left the earlier `webhook` child untracked; even a successful empty snapshot failed to remove it. Reproduced this behavior with version 0.26.0 and added a clearly marked one-time `depth.clear()` before initializing `known`. This aligns the Gauge children with the initially empty tracking state. The clear is initialization only, outside the publishing function.

## Review Notes
- Installed prometheus-client 0.26.0 in an isolated temporary virtual environment and executed all three Python snippets. The pinned version is available and the APIs used remain documented; no deprecated API use was identified.
- Verified removal, reappearance, detached child updates, and retention of metric-family metadata after clearing all children.
- Verified snapshot reconciliation, successful empty inventory handling, and preservation of the previous output when duplicate, negative, boolean, non-integer, or missing-field input is rejected.
- Registered the custom collector in a separate registry with an immutable snapshot and verified that replacing the snapshot removes disappeared samples on the next collection.
- Verified that the Python client's encoder selection accepts the OpenMetrics media type. No live HTTP endpoint or Prometheus server was available for end-to-end scrape testing; server-side staleness and history claims were checked against official documentation.
- The single-publisher and non-atomic reconciliation caveats are accurate. The custom collector requires the application to supply the described validated snapshot callback and synchronization.
- Multiprocess label removal is explicitly unsupported in the official documentation. Exporter child removal does not delete Prometheus history, and recreating counter children restarts their cumulative values.
- The technical reference links resolve to the intended official resources. There are no terminal commands or configuration snippets in the post.
