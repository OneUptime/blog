# Validation Summary: How to Configure ServiceEntry for TCP External Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio protocol selection
- Envoy TCP proxying and circuit breaking
- Kubernetes workloads and kubectl
- Prometheus and PromQL
- TLS and SNI

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Understanding Traffic Routing: https://istio.io/latest/docs/ops/configuration/traffic-management/traffic-routing/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Collecting Metrics for TCP Services: https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Egress TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Envoy Circuit Breaking: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- PostgreSQL protocol flow documentation: https://www.postgresql.org/docs/current/protocol-flow.html
- MySQL client/server protocol TLS documentation: https://dev.mysql.com/doc/dev/mysql-server/latest/page_protocol_basic_tls.html

## Issues Found
- The TCP connection pool explanation said new connection attempts queue when `maxConnections` is reached. Envoy documents this as a circuit breaker overflow for maximum upstream connections, so the post now says Envoy rejects additional upstream connection attempts instead of opening more.
- The TLS section used a PostgreSQL-style encrypted database example with `protocol: TLS`. That is only correct when the downstream connection starts with a TLS ClientHello. The post now uses a generic TLS service example and notes that STARTTLS, PostgreSQL SSL negotiation, and MySQL TLS upgrade should remain configured as `TCP`.
- The TLS origination example only showed a DestinationRule and implied the ServiceEntry should be `protocol: TLS`. The post now includes a ServiceEntry using `protocol: TCP` with `targetPort` plus a DestinationRule using `tls.mode: SIMPLE`, matching Istio's client-plaintext, upstream-TLS model.
- The outlier detection explanation said five failures "in 30 seconds" cause ejection. Istio's `interval` is the ejection sweep interval, while `consecutive5xxErrors` counts consecutive qualifying failures. The wording now reflects that distinction.
- The metrics example labeled `istio_tcp_connections_opened_total` as active TCP connections. It is a counter for opened connections, so the label was corrected.

## Review Notes
The ServiceEntry and DestinationRule API versions and fields are current for Istio's latest documentation. The debugging commands match the `istioctl proxy-config` command family, and the TCP metric names and `destination_service` label are documented Istio standard metrics.
