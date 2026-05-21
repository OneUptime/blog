# Validation Summary: How to Read and Interpret Envoy Access Logs for Debugging

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- IstioOperator meshConfig access logging
- Envoy access logs
- Envoy response flags and command operators
- Kubernetes kubectl logs
- Shell filtering with grep and awk

## Sources Consulted
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy substitution formatter command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The default Istio access log field breakdown skipped the `%UPSTREAM_TRANSPORT_FAILURE_REASON%` field and mislabeled the following fields. Updated the table to match Istio's documented default format, including upstream cluster, addresses, requested server name, and route name.
- The slow request awk example checked `$11`, which is bytes sent when awk splits the quoted request line into method, path, and protocol. Changed it to `$12`, the duration field for Istio's default text format under awk whitespace splitting.
- The inbound vs outbound section said to use the route name field at the end of the log. In Istio's documented default format, inbound and outbound values such as `inbound|8080||` and `outbound|8080||service` are in the upstream cluster field after the upstream host. Updated the wording accordingly.

## Review Notes
The Telemetry API examples, response flag descriptions, IstioOperator meshConfig usage, and kubectl log commands are consistent with the consulted official documentation. The grep examples are useful quick filters, but production users may prefer structured JSON access logs or more precise parsing to avoid matching unrelated text in free-form log lines.
