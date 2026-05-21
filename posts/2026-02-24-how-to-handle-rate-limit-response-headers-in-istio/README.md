# How to Handle Rate Limit Response Headers in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, HTTP Headers, Envoy, API Design

Description: How to configure and customize rate limit response headers in Istio so API clients can understand and adapt to rate limiting behavior.

---

Good rate limiting is not just about blocking excess requests. It is about communicating clearly with clients so they can adjust their behavior. Rate limit response headers tell clients how many requests they have left, when the limit resets, and what the limit is. Without these headers, clients are left guessing, which leads to retry storms and poor user experience.

## Standard Rate Limit Headers

There are several conventions for rate limit headers. The most common ones you will see in the wild:

- `X-RateLimit-Limit` - the maximum number of requests allowed in the window
- `X-RateLimit-Remaining` - how many requests are left in the current window
- `X-RateLimit-Reset` - when the current window resets (usually Unix timestamp)
- `Retry-After` - how many seconds to wait before retrying (on 429 responses)

There are also IETF drafts for rate limit headers. Earlier drafts used `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` without the X- prefix, while later drafts moved toward a combined `RateLimit` header. RFC 6585 defines the `429 Too Many Requests` status code and allows a `Retry-After` header on 429 responses.

## Rate Limit Headers with Global Rate Limiting

When using the global rate limit service, Envoy can add headers from the rate limit response. The rate limit service returns headers in its gRPC response, and Envoy forwards them to the client.

Configure the EnvoyFilter to enable header forwarding:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-response-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: api-gateway
          failure_mode_deny: false
          timeout: 0.5s
          enable_x_ratelimit_headers: DRAFT_VERSION_03
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
```

The key setting is `enable_x_ratelimit_headers: DRAFT_VERSION_03`. This tells Envoy to include the standard rate limit headers in responses. The supported values are:

- `OFF` - no rate limit headers (default)
- `DRAFT_VERSION_03` - adds `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset` headers

## What the Headers Look Like

With `DRAFT_VERSION_03` enabled, a normal response includes:

```text
HTTP/1.1 200 OK
x-ratelimit-limit: 100, 100;w=60
x-ratelimit-remaining: 87
x-ratelimit-reset: 42
```

And, if `Retry-After` is also configured, a rate-limited response:

```text
HTTP/1.1 429 Too Many Requests
x-ratelimit-limit: 100, 100;w=60
x-ratelimit-remaining: 0
x-ratelimit-reset: 42
retry-after: 42
```

The `w=60` parameter indicates a 60-second window. The `x-ratelimit-reset` value is the number of seconds until the window resets.

## Adding Custom Headers with Local Rate Limiting

Local rate limiting can emit the same `X-RateLimit-*` headers when `enable_x_ratelimit_headers` is enabled. You can also add static headers for rate-limited responses in the EnvoyFilter configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: http_local_rate_limiter
          token_bucket:
            max_tokens: 100
            tokens_per_fill: 100
            fill_interval: 60s
          enable_x_ratelimit_headers: DRAFT_VERSION_03
          filter_enabled:
            runtime_key: local_rate_limit_enabled
            default_value:
              numerator: 100
              denominator: HUNDRED
          filter_enforced:
            runtime_key: local_rate_limit_enforced
            default_value:
              numerator: 100
              denominator: HUNDRED
          response_headers_to_add:
          - append_action: OVERWRITE_IF_EXISTS_OR_ADD
            header:
              key: x-local-rate-limit
              value: "true"
```

The headers in `response_headers_to_add` are static values and are added only to responses for requests that have been rate limited. The standard `X-RateLimit-*` values are generated by the local rate limit filter when `enable_x_ratelimit_headers` is enabled.

## Adding Retry-After Headers

The `Retry-After` header is particularly important for 429 responses. It tells clients exactly how long to wait before retrying. `DRAFT_VERSION_03` adds the `X-RateLimit-*` headers, but it does not automatically add `Retry-After`. Add `Retry-After` from the rate limit service response or by using `response_headers_to_add` for rate-limited responses.

For local rate limiting, add it as a response header on rate-limited requests:

```yaml
response_headers_to_add:
- append_action: OVERWRITE_IF_EXISTS_OR_ADD
  header:
    key: retry-after
    value: "60"
```

## Using Lua Filters for Dynamic Headers

If you need custom header behavior beyond the standard `X-RateLimit-*` values, a Lua filter can help:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-dynamic-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_response(response_handle)
              local status = response_handle:headers():get(":status")
              if status == "429" then
                response_handle:headers():add("retry-after", "30")
                response_handle:headers():add("x-rate-limit-policy", "standard")
              end
            end
```

This adds `retry-after` and a custom policy header only on 429 responses.

## Customizing the 429 Response Body

Beyond headers, you might want a custom response body for rate-limited requests. One option is a Lua response filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-custom-body
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_response(response_handle)
              local status = response_handle:headers():get(":status")
              if status == "429" then
                response_handle:headers():replace("content-type", "application/json")
                local body = '{"error":"rate_limit_exceeded","message":"Too many requests. Please retry after the time specified in the Retry-After header.","code":429}'
                response_handle:body():setBytes(body)
              end
            end
```

## Client-Side Implementation

With proper headers in place, clients can implement smart retry logic:

```python
import requests
import time

def make_api_call(url, headers):
    response = requests.get(url, headers=headers)

    if response.status_code == 429:
        retry_after = int(response.headers.get('retry-after', 60))
        print(f"Rate limited. Waiting {retry_after} seconds.")
        time.sleep(retry_after)
        return make_api_call(url, headers)

    remaining = response.headers.get('x-ratelimit-remaining')
    if remaining and int(remaining) < 10:
        print(f"Warning: Only {remaining} requests remaining in current window")

    return response
```

## Verifying Headers

Test that headers are being returned correctly:

```bash
curl -v http://gateway-ip/api/endpoint 2>&1 | grep -i ratelimit
```

You should see the rate limit headers in the response. Send rapid requests to trigger a 429 and verify the headers change:

```bash
for i in $(seq 1 5); do
  echo "Request $i:"
  curl -s -D - -o /dev/null http://gateway-ip/api/endpoint | grep -i "ratelimit\|retry-after\|status"
  echo
done
```

## Summary

Rate limit response headers are essential for building a developer-friendly API. In Istio, the global rate limiting approach with `enable_x_ratelimit_headers: DRAFT_VERSION_03` can expose dynamic remaining counts and reset times from the rate limit service response. Local rate limiting can also emit standard `X-RateLimit-*` headers, while `response_headers_to_add` is useful for static headers on rate-limited responses. Always include `Retry-After` on 429 responses and consider adding custom JSON response bodies to make your API errors clear and actionable for consumers.
