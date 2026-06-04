# Validation Summary: How to Configure Contour HTTPProxy with Request and Response Header Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Contour HTTPProxy
- Envoy request and response header formatting
- CORS
- kubectl
- curl

## Sources Consulted
- Contour HTTPProxy API reference: https://projectcontour.io/docs/main/config/api-reference/
- Contour Request Rewriting and Header Rewriting documentation: https://projectcontour.io/docs/main/config/request-rewriting/
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers
- Envoy substitution formatter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- curl manual: https://curl.se/docs/manpage.html

## Issues Found
- `corsPolicy.maxAge` was shown as a bare integer (`86400`), but current Contour documents this field as a Go duration string. Changed it to `24h`.
- The tracing example comment said it would add a trace ID if one was not present, but `%REQ(...)%` reads an existing request header and does not generate a new B3 trace ID. Changed the comment to say it propagates the trace ID if present.
- The response timing example used `%DURATION%`, which represents total request duration to the last byte out and may not be available when response headers are generated. Changed it to `%RESPONSE_DURATION%`, which is available for upstream response timing.

## Review Notes
The HTTPProxy API version, `requestHeadersPolicy` and `responseHeadersPolicy` fields, header `set` and `remove` syntax, header route condition, CORS field names, dynamic header formatter syntax, `curl` commands, and `kubectl` commands were otherwise consistent with the consulted documentation. `kubectl` was not installed in the local workspace, so those commands were verified against the official Kubernetes generated command reference rather than local `--help` output.
