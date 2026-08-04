# Fix Snappy Corrupt Input and Content-Type Errors in Prometheus Remote Write

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, Snappy, Protobuf, Content-Type, HTTP 415, Troubleshooting

Description: Diagnose Remote Write decoding failures by checking Snappy framing, protobuf message negotiation, reserved headers, endpoint routing, and proxy body integrity.

---

Prometheus Remote Write does not send JSON, form data, or the text exposition format used by `/metrics`. Its HTTP body is a binary protobuf message compressed with Snappy. A receiver error such as `snappy: corrupt input` means the bytes did not decode as the Snappy format expected by the protocol. A content-type error means the receiver cannot select or accept the protobuf schema declared by the sender.

Treat these as wire-format failures. Queue tuning and longer timeouts cannot repair an incorrectly encoded request.

## The Required Wire Format

For both Remote Write protocol versions, a sender makes an HTTP POST to the receiver-provided URL. The reserved request headers include:

```http
Content-Encoding: snappy
Content-Type: application/x-protobuf
X-Prometheus-Remote-Write-Version: 0.1.0
User-Agent: Prometheus/...
```

That header combination is the backward-compatible form for the Remote Write 1.0 `prometheus.WriteRequest` message.

Remote Write 2.0 identifies its different protobuf message through the `proto` media-type parameter:

```http
Content-Encoding: snappy
Content-Type: application/x-protobuf;proto=io.prometheus.write.v2.Request
X-Prometheus-Remote-Write-Version: 2.0.0
```

The 2.0 specification requires Snappy **block format**, also called raw Snappy. It explicitly forbids Snappy framed or streaming format. Remote Write 1.0 also specifies block Snappy.

The correct transformation order is:

```text
protobuf message -> binary protobuf marshal -> Snappy block encode -> HTTP body
```

Compressing YAML, JSON, OpenMetrics text, or an already compressed body produces valid Snappy bytes around the wrong payload, which fails later during protobuf decoding.

## The Most Common Cause: Framed Snappy

Many command-line Snappy programs create the framed stream format. That format starts with framing metadata and is useful for files, but it is not the Remote Write wire format. A generic command such as this is therefore not a safe way to create a request:

```bash
# Do not assume this produces Remote Write block Snappy.
snzip payload.pb
```

Use a Remote-Write-compatible sender library or Prometheus itself. If implementing a sender, use a Snappy API that encodes a complete byte slice as a raw block and verify it with the Prometheus compliance suite.

A quick forensic clue is the first bytes. A framed Snappy stream commonly contains the stream identifier `sNaPpY`; a raw Snappy block does not carry that framing header. Inspect a captured body without printing it into a normal text log:

```bash
xxd -l 32 request-body.bin
```

Do not convert the body through shell variables, JSON logging, UTF-8 decoding, or copy and paste. Remote Write payloads can contain zero bytes and arbitrary binary values.

## Match the Protobuf Message to Content-Type

Current Prometheus exposes this sender setting:

```yaml
remote_write:
  - url: https://metrics.example.net/api/v1/write
    protobuf_message: prometheus.WriteRequest
```

The default remains `prometheus.WriteRequest`. To opt into the 2.0 message:

```yaml
remote_write:
  - url: https://metrics.example.net/api/v1/write
    protobuf_message: io.prometheus.write.v2.Request
```

Do this only after confirming that the receiver supports `io.prometheus.write.v2.Request`. Prometheus v3.13.1 source defaults its built-in receiver's accepted list to both supported messages, although the generated command reference still displays only `prometheus.WriteRequest`. Check `prometheus --help` for the exact deployed binary. To state a dual-protocol policy explicitly, repeat the list-valued flag:

```text
--web.enable-remote-write-receiver
--web.remote-write-receiver.accepted-protobuf-messages=prometheus.WriteRequest
--web.remote-write-receiver.accepted-protobuf-messages=io.prometheus.write.v2.Request
```

A receiver that follows the 2.0 specification uses the `Content-Type` header to select the message schema. It should return HTTP 415 for an unsupported media type or encoding. Some 1.x receivers return HTTP 400 instead, so read the response body and receiver documentation.

The 2.0 protobuf deliberately reserves early fields so that an old receiver decoding it as a 1.0 message tends to see an empty message rather than a deterministic parse error. That makes correct content negotiation especially important: a misleading success with zero written samples is possible in a broken receiver that ignores `Content-Type`. Version 2.0 addresses this with mandatory written-count response headers.

## Do Not Override Reserved Headers

Prometheus sets protocol headers itself and prevents users from overwriting headers it owns. This is intentional. A reverse proxy, gateway transform, or custom client can still damage them.

Check the request as received at the final backend, not only as emitted by the client:

```text
method:           POST
content-encoding: snappy
content-type:     application/x-protobuf[;proto=...]
body:             unchanged binary bytes
```

Remove proxy behavior that:

- decompresses a body but leaves `Content-Encoding: snappy`;
- compresses an already Snappy-encoded body again;
- parses the request as a form or JSON document;
- converts binary data to text;
- replaces `Content-Type` with `application/json` or `application/octet-stream`;
- sends the request to a non-Remote-Write endpoint.

HTTP transfer encoding and Remote Write content encoding are different. A proxy may safely reframe HTTP transport while preserving the entity body, but it must not change the Snappy-compressed bytes.

## Confirm You Reached the Right Endpoint

Prometheus receives Remote Write at `/api/v1/write` only when started with `--web.enable-remote-write-receiver`:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
```

These endpoints expect different formats:

```text
/metrics        Prometheus exposition from a target
/api/v1/query   URL-encoded Prometheus HTTP API request
/api/v1/read    Snappy protobuf Remote Read request
/api/v1/write   Snappy protobuf Remote Write request
```

Sending Remote Write to `/api/v1/read`, or sending scraped text to `/api/v1/write`, cannot be fixed with headers alone.

## A Layer-by-Layer Diagnostic Method

### 1. Start with an Unmodified Prometheus Sender

Configure Prometheus directly against the receiver, bypassing custom proxies if policy permits. If this works, the receiver supports Prometheus's format and the fault is in the removed hop or custom sender.

### 2. Record the Negotiated Message

Inspect the effective Prometheus configuration at `/api/v1/status/config` and confirm `protobuf_message`. Check the receiver's accepted messages in its official documentation or running flags.

### 3. Compare Body Hashes Across the Proxy

In a controlled test environment, capture the exact compressed request body immediately before and after the proxy and compare cryptographic hashes:

```bash
sha256sum sender-body.bin receiver-body.bin
```

Different hashes prove a transform or capture problem. Protect captures as potentially sensitive operational data and delete them according to your security policy.

### 4. Read the Full Sender Error

Prometheus logs the receiver status and response text for failed writes. Distinguish:

- Snappy decode failure: wrong compression format, truncation, or modified body;
- protobuf unmarshal failure: decompression worked, but schema or payload is wrong;
- unsupported media type: receiver rejects the content negotiation;
- invalid sample or label error: wire decoding worked and validation failed later.

### 5. Watch Non-Recoverable Failures

```promql
rate(prometheus_remote_storage_samples_failed_total{remote_name="central"}[5m])
```

Protocol-related HTTP 4xx responses are normally non-recoverable. Repeatedly retrying the same malformed bytes would not help, so fix the format before changing retry policy.

## If You Maintain a Custom Sender

Do not infer the protocol from examples of hand-built `curl` requests. Implement these invariants and run the official compliance tests:

1. Build the selected protobuf message using its authoritative `.proto` schema.
2. Sort labels and preserve per-series timestamp order as required by the specification.
3. Marshal with protobuf binary encoding.
4. Compress once with raw Snappy block encoding.
5. send an HTTP POST with the reserved headers matching the selected message.
6. Treat invalid-sample responses as non-retriable. Do not resend unsupported content unchanged; a 2.0 sender may retry HTTP 415 with a different supported content type or encoding. Follow the protocol's rules for 429 and 5xx.
7. For 2.0, validate the receiver's written-count response headers.

Once each boundary agrees on body bytes, Snappy format, protobuf schema, and content negotiation, corrupt-input and content-type errors become deterministic rather than mysterious.

## Official Documentation

- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus Remote Write sender configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus receiver command-line flags](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus v3.13.1 receiver flag defaults in source](https://github.com/prometheus/prometheus/blob/v3.13.1/cmd/prometheus/main.go#L465-L467)
- [Prometheus Remote Write protobuf definitions](https://github.com/prometheus/prometheus/tree/main/prompb)
- [Prometheus Remote Write compliance tests](https://github.com/prometheus/compliance/tree/main/remotewrite)
- [Snappy framing format](https://github.com/google/snappy/blob/main/framing_format.txt)
