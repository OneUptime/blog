# Validation Summary: How to Route Cloudflare Tunnel Access Logs to the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloudflare Tunnel (`cloudflared`)
- OpenTelemetry Collector Contrib
- Filelog receiver and stanza operators
- Prometheus receiver
- Docker Compose
- OTLP exporter

## Sources Consulted
- Cloudflare Tunnel run parameters: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/
- Cloudflare Tunnel monitoring and logs: https://developers.cloudflare.com/tunnel/monitoring/
- Cloudflare Tunnel metrics: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/monitor-tunnels/metrics/
- OpenTelemetry Collector Contrib filelog receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry stanza regex parser docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry stanza severity parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- Expr language definition used by stanza operator conditions: https://github.com/expr-lang/expr/blob/master/docs/language-definition.md

## Issues Found
- The post claimed `cloudflared` generates access logs for every proxied request. Cloudflare documents that logs cover tunnel/origin activity, and request URL/method/header details are exposed at `debug` level. Updated the wording to avoid overstating default access-log behavior.
- The sample request log used an unsupported-looking `INF GET ... status originTime` format. Updated the example and parser to match the documented debug-level request details format more closely.
- Multiple `regex_parser` operators were used without unique `id` fields. The filelog receiver docs require unique IDs when using the same operator type more than once. Added explicit IDs.
- The connection-event example parsed `Request connection`, while current cloudflared logs commonly use `Registered tunnel connection` for established tunnel connections. Updated the example log and parser.
- The Docker Compose sidecar metrics setup would not work with `localhost:2000` from the Collector container. Updated cloudflared to bind metrics on `0.0.0.0:2000` and the Prometheus receiver to scrape `cloudflared:2000`.
- The metrics list included non-current metric names, including `cloudflared_tunnel_request_per_second` and `cloudflared_tunnel_response_by_code`. Replaced them with documented metrics such as `cloudflared_tunnel_total_requests` and `cloudflared_tunnel_concurrent_requests_per_tunnel`.
- The alert example used `rate(cloudflared_tunnel_request_errors)` without a range selector. Updated it to `rate(cloudflared_tunnel_request_errors[5m])`.

## Review Notes
The alerting examples remain pseudocode rather than a complete PrometheusRule or backend-specific alert format. The tutorial is now technically consistent, but a future improvement could show a complete alert rule for a specific alerting system.
