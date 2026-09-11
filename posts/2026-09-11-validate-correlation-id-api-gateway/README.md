# Generate and Validate Correlation IDs at an API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, API Gateway, HTTP, Security, Logging

Description: Generate authoritative correlation IDs at the public gateway, validate trusted upstream values, and prevent spoofed IDs from becoming trusted log context.

---

A correlation ID joins records from a request across a gateway and its downstream services. A client can put any syntactically valid value in `X-Correlation-ID`, including a value copied from another user's request. Validation makes a value safe to handle; it does not prove where that value came from.

Establish an ownership rule before configuring propagation. A useful default is to generate a fresh ID at the public edge and allow only authenticated internal gateways to preserve an existing ID. The application then receives one authoritative value for logging and returns that value to the caller.

## Generate an ID at the public edge

NGINX provides `$request_id`, a value generated from 16 random bytes and represented in hexadecimal. Use it for the upstream request, access log, and response. In this example, the external header never becomes the internal correlation ID:

```nginx
http {
    log_format correlated escape=json
        '{"correlation_id":"$request_id",'
        '"method":"$request_method","status":$status,'
        '"request_time":$request_time}';

    upstream application {
        server 127.0.0.1:8080;
    }

    server {
        listen 8000;
        access_log /var/log/nginx/access.log correlated;
        add_header X-Correlation-ID $request_id always;

        location / {
            proxy_set_header X-Correlation-ID $request_id;
            proxy_hide_header X-Correlation-ID;
            proxy_pass http://application;
        }
    }
}
```

This is the `http` section of an NGINX configuration; retain the normal top-level `events` block and deployment settings. The upstream application must log the supplied ID rather than generating another one for the same inbound request.

`proxy_hide_header` avoids returning an additional, conflicting ID from the upstream. The `always` parameter includes the response header for error status codes handled in that configuration context. Review child locations that define their own `add_header` directives because normal inheritance can change which headers are applied.

The [NGINX core variables](https://nginx.org/en/docs/http/ngx_http_core_module.html#var_request_id), [proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header), and [response header module](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header) describe these primitives.

## Validate values on a trusted internal listener

An internal proxy may need to preserve the ID assigned by the public edge. Use a separate listener that requires authenticated callers, such as verified client certificates, and accepts a narrow format. Do not select trust using a client-supplied `X-Internal` header.

For a 32-character lowercase hexadecimal contract, the normalization step is:

```nginx
# In the http context. Use this only for trusted internal traffic.
map $http_x_correlation_id $internal_correlation_id {
    default $request_id;
    "~^[0-9a-f]{32}$" $http_x_correlation_id;
}
```

Configure that listener's upstream header, response header, and log format to use `$internal_correlation_id`. If the header is absent or malformed, a new local ID is generated. Authentication must be configured separately; this `map` does not authenticate the connection.

The format is a local application contract, not a requirement of the `X-Correlation-ID` name. If your organization uses UUIDs, enforce that format consistently instead. Avoid an unlimited “anything printable” policy that lets enormous strings or parser delimiters reach every downstream log.

## Decide whether to reject or replace

Replacement keeps a public API usable when optional diagnostic metadata is invalid. Rejection can be appropriate on an internal contract where malformed metadata indicates a broken integration. Whichever policy you choose, keep its outcome observable with bounded fields such as `correlation_source=generated` and `correlation_reason=invalid`.

Do not log the raw rejected header to explain the rejection. That defeats the purpose of sanitizing it and can create log injection or expose accidentally supplied credentials. A length and a bounded reason code usually provide enough evidence.

Repeated header fields deserve an explicit policy. Different HTTP stacks can combine or select repeated values differently. Test the exact gateway chain with duplicate `X-Correlation-ID` fields. A public edge that unconditionally overwrites the header avoids treating an ambiguous external value as authoritative.

## Keep correlation separate from authorization

A correlation ID is a search key. It must never grant access to an order, trace, support record, or tenant. A user who knows another correlation ID still needs normal authorization to see the associated data.

The same principle applies to `traceparent`. A valid trace header is externally supplied observability context. Decide where trace continuation is allowed independently of the correlation ID policy. Do not overwrite W3C trace identifiers with arbitrary application strings.

Avoid using correlation IDs as metric labels. Every request creates a new value, so a metric dimension would grow with traffic. Store exact IDs in structured logs and traces, while counting generated, accepted, and replaced outcomes using a small fixed set of labels.

## Verify the complete path

Send requests with no header, a valid-looking external header, an invalid value, and repeated fields:

```bash
curl -i http://localhost:8000/health
curl -i -H 'X-Correlation-ID: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
  http://localhost:8000/health
curl -i -H 'X-Correlation-ID: invalid-value' \
  http://localhost:8000/health
```

The public edge should return a fresh hexadecimal value each time. Compare it with the gateway access record and application log, including a deliberate upstream 500 and an unavailable upstream. Test a trusted internal request separately to confirm preservation only occurs on that path.

Also verify deployment routes that bypass the gateway. A backend reachable directly from the internet cannot safely assume that an incoming diagnostic header was assigned by your edge.

## Conclusion

Generate correlation IDs at the public trust boundary, preserve them only across authenticated internal paths, and validate every accepted value against a bounded contract. Use the same chosen ID in the upstream request, access log, and response so support can follow one request without trusting a caller's chosen identity.

## Official Documentation

- [NGINX request variables](https://nginx.org/en/docs/http/ngx_http_core_module.html#variables)
- [NGINX map module](https://nginx.org/en/docs/http/ngx_http_map_module.html)
- [NGINX proxy headers](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)
- [NGINX response headers](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
