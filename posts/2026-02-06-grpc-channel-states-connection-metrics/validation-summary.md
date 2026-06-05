# Validation Summary: How to Monitor gRPC Channel States and Connection Pool Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC channel connectivity states
- gRPC Go client API
- gRPC Python channel API
- OpenTelemetry metrics for Go
- OpenTelemetry metrics for Python
- Prometheus alerting rules

## Sources Consulted
- gRPC connectivity semantics and API: https://grpc.github.io/grpc/core/md_doc_connectivity-semantics-and-api.html
- gRPC Go `ClientConn`, `GetState`, and `WaitForStateChange` API: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go connectivity states: https://pkg.go.dev/google.golang.org/grpc/connectivity
- gRPC Go insecure transport credentials: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- OpenTelemetry Go metric API: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- gRPC Python `Channel.subscribe` API: https://grpc.github.io/grpc/python/grpc.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Go metric named `grpc.client.connections.active` claimed to count active gRPC connections, but the code was only incrementing and decrementing on channel transitions into and out of `READY`. Renamed the instrument to `grpc.client.channels.ready`, updated the variable to `readyChannels`, and changed the description/comment so the metric accurately reflects ready channels rather than transport connections.
- The Go observable gauge registration discarded the returned instrument and error. Updated `RegisterGauges` to assign the instrument to `currentState` and check the error.
- The Python example used the private `channel._channel.check_connectivity_state(True)` implementation detail. Replaced it with public `Channel.subscribe` state delivery and initialized `last_state` from the first callback.
- The Python callback called `channel.subscribe()` again on every state change. The official API keeps a subscription active until unsubscribe or channel cleanup, so re-subscribing would create duplicate callbacks. Removed the repeated subscription and returned the callback so callers can unsubscribe if needed.
- Removed an unused `threading` import from the Python example.

## Review Notes
- The gRPC state names and state descriptions match the official connectivity state model.
- `grpc.NewClient`, `ClientConn.GetState`, `ClientConn.WaitForStateChange`, `insecure.NewCredentials`, and the OpenTelemetry Go metric APIs used in the examples are current APIs.
- The Prometheus expressions use normalized metric and label names as expected after OpenTelemetry-to-Prometheus export, but exact exported names can still vary with the exporter and view configuration.
