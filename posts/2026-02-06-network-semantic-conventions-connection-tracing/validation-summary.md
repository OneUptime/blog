# Validation Summary: How to Use Network Semantic Conventions for Connection Tracing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python tracing API
- Python socket networking
- DNS resolution
- TCP connections
- Connection pooling
- OpenTelemetry Collector processors and host metrics

## Sources Consulted
- OpenTelemetry semantic conventions: General attributes, including `network.*`, `server.*`, and `client.*` attributes: https://opentelemetry.io/docs/specs/semconv/general/attributes/
- OpenTelemetry semantic conventions: Network attributes and deprecated `net.*` replacements: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/
- OpenTelemetry Python tracing API, including span attributes, events, status, exceptions, and `start_as_current_span`: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation documentation for setting span status and recording exceptions: https://opentelemetry.io/docs/languages/python/instrumentation/
- Python `socket` module documentation for `getaddrinfo`, socket creation, `connect`, and socket address tuples: https://docs.python.org/3/library/socket.html
- OpenTelemetry Collector processor documentation for `resourcedetection`: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Kubernetes Collector components documentation for the `hostmetrics` network scraper: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/

## Issues Found
- The post implied that custom attributes such as `dns.lookup_duration_ms`, `tcp.connect_duration_ms`, and `pool.wait_duration_ms` were standardized OpenTelemetry semantic convention attributes. I clarified that these are custom diagnostic attributes used alongside standardized `network.*` attributes.
- The DNS example described recording the selected address family but only inferred families from all returned `getaddrinfo` results. I changed the wording to "resolved address families" and changed the example to set custom `dns.has_ipv4` and `dns.has_ipv6` flags instead of incorrectly setting `network.type` for the DNS lookup span.
- The DNS error example used `span.set_status(trace.StatusCode.ERROR, ...)`. I updated it to import and use `Status(StatusCode.ERROR, ...)`, matching the documented OpenTelemetry Python pattern.
- The connection pool example acquired connections but did not include a release path, making `pool.active_connections` and `pool.active_after_acquire` misleading over time. I added a minimal `release` method that returns the connection to the queue and decrements the active count.
- The best-practices section said the Collector `resourcedetection` processor adds host-level network information. I corrected this to say it adds host and environment resource metadata, and noted that host network I/O metrics should come from a receiver such as `hostmetrics` with the network scraper.
- The conclusion described DNS timing, TCP timing, and pool behavior as standardized span attributes. I revised it to distinguish standardized connection attributes from custom diagnostic attributes.

## Review Notes
The post is technically relevant and the Python snippets are syntactically valid. The examples are intentionally simplified and do not include production concerns such as thread-safe pool accounting, TLS negotiation timing, HTTP response parsing, or retrying all `getaddrinfo` results.
