# Debugging OTLP/gRPC `GOAWAY` and `FRAME_SIZE_ERROR` Through Proxies and Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, gRPC, HTTP/2, Troubleshooting

Description: Separate graceful HTTP/2 connection draining from framing errors and keepalive rejection when OTLP gRPC crosses proxies or load balancers.

`GOAWAY` and `FRAME_SIZE_ERROR` both appear in HTTP/2 diagnostics, but they describe different things. A server can send `GOAWAY` during an ordinary connection drain. A frame-size error means the HTTP/2 parser rejected framing on a particular connection.

For OTLP, first establish whether exports actually failed. A connection replacement that completes pending requests and reconnects successfully is different from repeated batches reaching their retry deadline.

## Preserve the error's context

Collect the full error, including the HTTP/2 error code, debug text, exporter name, and timestamp. Check whether it appears immediately on connection establishment, after a fixed idle interval, or during a deployment.

Build a small evidence table before changing settings:

| Observation | Next check |
|---|---|
| Immediate framing failure on every connection | Protocol and port at the receiving hop |
| `GOAWAY` during proxy rollout with successful exports | Connection drain and reconnect behavior |
| `too_many_pings` debug text | Client keepalive versus server enforcement |
| Failures after the same idle duration | Load balancer and proxy idle limits |
| Rejections only for larger telemetry batches | gRPC message limits and actual HTTP/2 framing evidence |

The [HTTP/2 specification](https://www.rfc-editor.org/rfc/rfc9113.html) defines `GOAWAY`, its last-stream identifier, and frame-size errors. A GOAWAY error code of `NO_ERROR` can be part of graceful shutdown. The client still needs to finish or retry affected work according to its transport and exporter behavior.

## Verify both sides of every proxy

For each hop, write down the port, whether TLS is enabled, and whether the connection uses HTTP/2. TLS termination at an ingress creates two separate connections. Successful HTTP/2 negotiation between the client and ingress does not prove that the ingress uses HTTP/2 upstream.

Check frontend TLS negotiation with the real hostname:

```bash
openssl s_client \
  -connect telemetry.example.com:443 \
  -servername telemetry.example.com \
  -alpn h2 \
  -verify_hostname telemetry.example.com \
  -verify_return_error </dev/null
```

Inspect certificate validation and the selected ALPN protocol. For a private CA, add the appropriate CA file. This checks TLS negotiation, not an OTLP export.

Then compare a real export directly to the Collector with one through the proxy. Keep credentials and telemetry constant. If only the proxied path fails, inspect the upstream route and its target port. Port 4317 normally serves OTLP/gRPC and 4318 OTLP/HTTP, but explicit configuration can change either assignment.

For NGINX, an existing HTTP/2 frontend routes a native gRPC service with `grpc_pass`, for example:

```nginx
location /opentelemetry.proto.collector.trace.v1.TraceService/ {
    grpc_pass grpc://collector.internal:4317;
}
```

Use `grpcs://` for a TLS-enabled upstream and configure upstream certificate trust, SNI, and verification. The [NGINX gRPC module](https://nginx.org/en/docs/http/ngx_http_grpc_module.html) documents these settings. An HTTP proxy configuration using an incompatible upstream protocol cannot be repaired by changing the span batch size.

## Distinguish frames from messages

A gRPC message can span multiple HTTP/2 DATA frames. The allowed gRPC message size and HTTP/2 frame size are different limits. A message-size rejection commonly surfaces as `RESOURCE_EXHAUSTED`; an HTTP/2 parser error belongs to the transport layer.

Unexpected HTTP/1 response bytes, TLS bytes on a plaintext listener, or an incorrect intermediary can cause a parser to interpret unrelated bytes as a frame header. Conversely, a real peer can send an invalid frame. Inspect the exact error and the emitting component before concluding that telemetry is too large.

Avoid raising every available limit at once. A controlled small request through the same path is useful: if it fails immediately in the same way, focus on transport compatibility first.

## Treat keepalive as a coordinated policy

If GOAWAY includes `too_many_pings`, compare the client ping interval and whether it pings without active calls against the server's minimum accepted interval. A load balancer may also have a separate idle timeout.

The [gRPC keepalive guide](https://grpc.io/docs/guides/keepalive/) warns that excessive pings can trigger connection closure. Make a coordinated change with the service owner. Increasing ping frequency to fix an idle timeout can make server enforcement failures worse.

Finally test ordinary traffic, an idle period, and a controlled proxy rollout. Watch exporter failures, queue growth, reconnection, and whether the expected telemetry arrives. Retain a bounded retry budget: transport recovery should absorb a brief disconnect, while a permanent framing mismatch needs a configuration fix.
