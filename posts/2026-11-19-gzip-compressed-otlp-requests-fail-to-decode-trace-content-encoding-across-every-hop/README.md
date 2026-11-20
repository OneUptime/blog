# Fix Gzip OTLP Decode Failures: Trace `Content-Encoding` Across Every Hop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, HTTP, Troubleshooting

Description: Diagnose OTLP/HTTP gzip failures by comparing body bytes and Content-Encoding at each proxy hop, then verify the repair with a small controlled request.

An OTLP export starts working when compression is disabled. That narrows the problem, but does not prove that the Collector cannot accept gzip. A proxy might remove `Content-Encoding` while forwarding compressed bytes, or decompress the body while leaving the header unchanged.

For OTLP over HTTP, encoding has two layers. `Content-Type` describes the telemetry serialization, such as JSON or binary Protobuf. `Content-Encoding` describes compression applied to that serialized body. Both must describe the bytes that actually arrive.

## Separate the two encodings

| Body on the wire | Content-Type | Content-Encoding |
| --- | --- | --- |
| OTLP JSON | `application/json` | Absent |
| Gzipped OTLP JSON | `application/json` | `gzip` |
| Binary OTLP Protobuf | `application/x-protobuf` | Absent |
| Gzipped OTLP Protobuf | `application/x-protobuf` | `gzip` |

The [OTLP specification](https://opentelemetry.io/docs/specs/otlp/#otlphttp-request) requires a gzip request to carry `Content-Encoding: gzip`. `Accept-Encoding: gzip` is different: it says the client can receive a compressed response. It does not compress the request.

## Make a minimal request pair

Use a development receiver with its traces pipeline enabled. Create an empty OTLP JSON envelope and its gzip representation:

```bash
printf '%s' '{"resourceSpans":[]}' > empty-traces.json
gzip -c empty-traces.json > empty-traces.json.gz
gzip -t empty-traces.json.gz
```

Send the plain body directly to the receiver:

```bash
curl --silent --show-error --fail-with-body \
  -D plain.headers -o plain.response \
  -H 'Content-Type: application/json' \
  --data-binary @empty-traces.json \
  http://127.0.0.1:4318/v1/traces
```

Then send the compressed body to the same URL:

```bash
curl --silent --show-error --fail-with-body \
  -D gzip.headers -o gzip.response \
  -H 'Content-Type: application/json' \
  -H 'Content-Encoding: gzip' \
  --data-binary @empty-traces.json.gz \
  http://127.0.0.1:4318/v1/traces
```

Do not substitute `curl --compressed` for `gzip -c`: that curl option requests and decodes compressed responses. Keep `--data-binary` so curl preserves the payload bytes. This behavior is documented in the [curl manual](https://curl.se/docs/manpage.html).

An empty request is a transport smoke test. It does not demonstrate that real spans survive processing or reach storage. Once decoding works, repeat with a nonempty span containing a fresh trace ID and inspect that ID downstream.

## Compare the direct and proxied paths

Repeat the same two files through the ingress URL using the required authentication. If the direct gzip request works and the proxied request fails, inspect each intermediary's request processing configuration. Capture only this synthetic body and redact credentials.

At every boundary, establish whether the body is still compressed, whether `Content-Encoding` agrees, and whether `Content-Type` remains unchanged. A gzip stream normally begins with hexadecimal bytes `1f 8b`; use that as a clue, then actually decompress the complete body to validate it. A partially captured or truncated stream can have a valid prefix and still fail.

| Observation | Next investigation |
| --- | --- |
| Gzip bytes arrive without a gzip header | Header removal or rewriting |
| JSON bytes arrive with a gzip header | Decompression without header correction |
| One decompression still leaves gzip bytes | Double compression |
| Small gzip succeeds, large gzip fails | Request limits and truncation, including decompressed size |
| HTML arrives instead of OTLP | Proxy error page, authentication redirect, or wrong route |

The repair should preserve the compressed body and header together, or deliberately decompress and update the header and message framing together. Avoid overriding the header to gzip for every request: uncompressed clients would then break.

## Restore compression and observe real delivery

For a Collector HTTP exporter, `compression: none` can isolate compression during diagnosis. Restore `compression: gzip` after fixing the path. Current upstream documentation uses the component name `otlp_http`; older releases use `otlphttp`. Match your distribution's component list:

```yaml
exporters:
  otlp_http/backend:
    endpoint: https://telemetry.example.com
    compression: gzip
```

The [HTTP exporter reference](https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter) documents these settings. Recheck export errors, queue growth, and actual received records after the change. OTLP/gRPC uses gRPC message compression and framing, so this HTTP-body test should not be sent to its usual port 4317.
