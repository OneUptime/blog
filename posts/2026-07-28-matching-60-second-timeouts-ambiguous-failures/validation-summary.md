# Validation Summary: Why Matching 60-Second Timeouts at Every Layer Causes Ambiguous Failures

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- HTTP timeout and deadline semantics
- HTTP 504 Gateway Timeout
- curl transfer timeouts
- AWS Application Load Balancer idle timeouts and access logs
- NGINX reverse proxy read timeouts and access-log configuration
- gRPC deadlines and deadline propagation
- Distributed tracing and cancellation
- Database pool and statement timeouts
- Streaming, long polling, retries, backoff, and jitter

## Sources Consulted

- [RFC 9110: 504 Gateway Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [curl command-line manual: `--max-time`](https://curl.se/docs/manpage.html#-m)
- [NGINX HTTP proxy module: `proxy_read_timeout`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout)
- [NGINX HTTP log module: `log_format`](https://nginx.org/en/docs/http/ngx_http_log_module.html#log_format)
- [NGINX HTTP upstream module: embedded timing and status variables](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#variables)
- [NGINX HTTP core module: `$request_id` and `$request_time`](https://nginx.org/en/docs/http/ngx_http_core_module.html#variables)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [AWS Application Load Balancer attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html)
- [AWS Application Load Balancer access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

## Issues Found

- The description of when an ingress timer starts assumed that the full request upload always finishes before the handler begins. Request bodies can instead be streamed. Changed the text to say the timer starts when the request reaches that layer and may begin before or after the full body arrives.
- The example timeline treated the load balancer's idle timeout as a single request timer. An AWS Application Load Balancer applies inactivity limits to client and target connections. Clarified that the illustrated interval begins after the last request byte on the client-facing connection and that this is the connection the load balancer can close at that point.
- The effective-deadline formula compared an absolute incoming deadline with a local maximum duration. Changed the local operand to `current time + local operation maximum` so both operands are absolute deadlines.
- The NGINX snippet defined a named `log_format` without stating that `log_format` is valid only in the `http` context or that the format must be selected by `access_log`. Added both requirements.
- The tracing guidance classified every child span that outlives a parent deadline as either a cancellation defect or detached work. Bounded cancellation cleanup can legitimately continue after the deadline. Narrowed the claim to useful request work, made the defect inference conditional, and explicitly allowed bounded cleanup.

## Review Notes

- curl's `--max-time` applies to each transfer. When `--retry` is enabled, curl resets that timer for every retry; use `--retry-max-time` or another outer deadline when retries must share one wall-clock budget.
- Automatic gRPC deadline propagation varies by language implementation. The gRPC guide states that it is enabled by default in Java and Go but must be explicitly enabled in some implementations, including C++.
- NGINX upstream variables can contain multiple comma- or colon-separated values when more than one upstream attempt or group is involved; correlate those values with `$upstream_addr`.
- No deprecated APIs, invalid URLs, or version-specific claims were found.
