# Validation Summary: How to Instrument Memcached Operations with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Python pymemcache instrumentation
- OpenTelemetry Collector Contrib Memcached receiver
- Memcached
- pymemcache
- Prometheus-style alerting

## Sources Consulted
- OpenTelemetry pymemcache instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/pymemcache/pymemcache.html
- OpenTelemetry Python pymemcache instrumentation source: https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/instrumentation/opentelemetry-instrumentation-pymemcache/src/opentelemetry/instrumentation/pymemcache/__init__.py
- OpenTelemetry Collector Contrib Memcached receiver package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/memcachedreceiver
- OpenTelemetry Collector Contrib Memcached receiver metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/memcachedreceiver/documentation.md
- OpenTelemetry Collector Contrib Memcached receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/memcachedreceiver/metadata.yaml
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- pymemcache Client API documentation: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.base.html

## Issues Found
1. The pymemcache span attribute comments listed `db.operation` and `db.memcached.key`, but the current OpenTelemetry pymemcache instrumentation records `db.system`, `db.statement`, and peer network attributes. Updated the comment to match the instrumentation source.
2. The server metric list used non-existent receiver metric names `memcached.operations.hit_ratio`, `memcached.network.sent`, and `memcached.network.received`. Updated them to `memcached.operation_hit_ratio`, `memcached.operations`, and `memcached.network` with the `direction` attribute.
3. The correlation diagram used the old hit-ratio metric name. Updated it to `memcached.operation_hit_ratio`.
4. The memory alert referenced `memcached_limit_bytes`, which is not emitted by the OpenTelemetry Memcached receiver. Changed the example to divide by an explicit configured byte limit and added a short comment to replace the example value.
5. The eviction explanation said frequent evictions can mean TTLs are too aggressive. Corrected it to say cached items may be living too long for available memory.
6. The multi-instance receiver section claimed each receiver automatically tags metrics with the endpoint. Updated the example to add distinct `memcached.instance` resource attributes per receiver and made the YAML fragment include the referenced OTLP receiver and exporter.

## Review Notes
The Prometheus alert metric names assume a backend or exporter that normalizes OpenTelemetry metric names to Prometheus-style names. Exact names can vary by exporter and translation settings, so teams should confirm the final metric names in their backend before copying the alert rules unchanged.
