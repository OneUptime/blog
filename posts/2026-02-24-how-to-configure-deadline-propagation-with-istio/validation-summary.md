# Validation Summary: How to Configure Deadline Propagation with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Istio Telemetry API
- Envoy Lua HTTP filter
- Envoy route timeout handling
- gRPC deadlines and `grpc-timeout`
- Kubernetes custom resources
- Go `net/http` and `context`
- Python Flask and Requests
- Prometheus PromQL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio request timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio custom metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Envoy route timeout and `grpc-timeout` reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy Lua filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC over HTTP/2 protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `context` package documentation: https://pkg.go.dev/context
- Flask API documentation: https://flask.palletsprojects.com/
- Requests API documentation: https://requests.readthedocs.io/

## Issues Found
- The post said `grpc-timeout` works for both gRPC and HTTP and implied Istio Envoy proxies automatically apply it. Updated the wording to state that `grpc-timeout` is a gRPC protocol header, that custom headers are preferable for ordinary HTTP services, and that Envoy only honors it for gRPC stream duration when route configuration supports it.
- The `grpc-timeout` unit list omitted nanoseconds and did not mention the protocol's 8-digit timeout value limit. Added the `n` unit and the value length requirement.
- The Go example assigned `result := doWork(ctx)` and never used `result`, which would not compile in Go. Changed it to call `doWork(ctx)` directly.
- The Go example ignored the error returned by `http.NewRequestWithContext`. Added error handling.
- The Go `grpc-timeout` parser ignored parse errors, omitted valid units, and accepted invalid values. Added basic validation and support for hours, microseconds, and nanoseconds.
- The Go formatter could emit invalid zero or overly long `grpc-timeout` values. Added bounds so the example returns a positive millisecond value within the protocol's 8-digit limit.
- The custom `x-deadline` section said an absolute timestamp avoids clock drift errors. Corrected it to note that absolute timestamps require reasonably synchronized clocks.
- The Python example left `deadline_str` unset when using the default deadline, so it would send `None` as a header value. Set `deadline_str` after creating the default deadline.
- The Envoy Lua filter used the older `inline_code` field. Updated the snippet to use `defaultSourceCode.inlineString`, matching the current v3 Lua filter shape shown in Istio examples.
- The VirtualService examples used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API version.
- The Telemetry example used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`.
- The Telemetry custom tag expression compared a possibly absent header lookup to an empty string. Updated it to check key presence in `request.headers`.
- The text said an Istio timeout would force-terminate the request. Clarified that the proxy stops waiting and returns a timeout, while application code still needs to observe cancellation/deadlines to stop its own work.

## Review Notes
The guide is technically relevant and salvageable. The examples remain illustrative rather than complete applications because helper functions such as `doWork` and `do_processing` are intentionally omitted. In production, teams should also validate incoming deadline headers, cap client-provided deadlines, avoid high-cardinality metric labels, and ensure application code observes cancellation signals.
