# How to Stream etcd Watches Through the gRPC Gateway Without Buffering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, gRPC, Watch, Networking, Troubleshooting

Description: Consume etcd gateway watch responses incrementally, distinguish idle streams from failures, and resume safely after disconnects or compaction.

---

The etcd gRPC gateway exposes watches over HTTP/JSON, but a watch response is a stream of messages rather than one JSON document that eventually finishes. A client that waits for the entire response body can look hung even while the server is delivering events correctly.

This tutorial uses the `/v3/watch` gateway in etcd 3.6 and 3.7. First verify a direct stream, then add the actual TLS, authentication, and proxy path. A native gRPC client is often simpler for a production watcher, but the gateway is useful when HTTP/JSON integration is required.

## Start with a bounded direct experiment

Use a disposable local etcd server on port 2379 for these commands. They intentionally create one demonstration key. In terminal one, watch the key `foo` with curl's output buffering disabled:

```bash
curl --no-buffer --silent --show-error \
  --connect-timeout 5 --max-time 60 \
  -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:2379/v3/watch \
  --data '{"create_request":{"key":"Zm9v","progress_notify":true}}'
```

`Zm9v` is the base64 representation of `foo`. The gateway uses protobuf's JSON mapping: byte fields such as keys and values are base64, and 64-bit integer fields commonly appear as decimal strings. The [gateway documentation](https://etcd.io/docs/v3.7/dev-guide/api_grpc_gateway/) shows the request and response format.

After receiving the watch-created response, write a value from terminal two:

```bash
curl --silent --show-error \
  -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:2379/v3/kv/put \
  --data '{"key":"Zm9v","value":"YmFy"}'
```

`YmFy` represents `bar`. The watch terminal should receive an event immediately rather than waiting for curl to exit. The 60-second limit is a deliberate observation window; curl ending with a timeout at that limit does not indicate an etcd failure. Delete the demonstration key afterward with `etcdctl del foo`.

## Parse messages incrementally

A watch stream can contain a creation acknowledgement, event responses, progress responses, and cancellation or error information. Treat each complete response message independently. Do not call a whole-body JSON parser that waits for end-of-file on an intentionally long-lived connection.

For a diagnostic view with jq installed, keep both stages unbuffered:

```bash
set -o pipefail
curl --no-buffer --silent --show-error \
  --connect-timeout 5 --max-time 60 \
  -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:2379/v3/watch \
  --data '{"create_request":{"key":"Zm9v","progress_notify":true}}' \
  | jq --unbuffered -c '.'
```

Printing the complete object preserves error envelopes for inspection. Filtering only `.result.events[]` can hide watch creation, cancellation, or an error outside the expected result shape. In an application, use a streaming decoder that handles transport chunks independently of JSON message boundaries. One network read is not necessarily one complete message.

Preserve revisions as integers with exact 64-bit support, or as decimal strings until exact conversion. Converting them through an IEEE-754 double can lose precision. Base64-decode keys and values as bytes before applying any application-specific text encoding.

## Identify the buffering layer

If direct streaming works but the application path delays events, compare each hop: curl output, the parser or logger, the reverse proxy, and the frontend HTTP client. A proxy may buffer upstream responses; an SDK may expose only a convenience method that buffers the body; a logging process may delay line delivery.

Configure the selected proxy's response-streaming behavior using its supported settings, and choose an upstream read/idle timeout appropriate to long-lived watches. Keep request and response buffering concepts separate: disabling request buffering does not necessarily disable buffering of events sent back to the client.

Test with a timestamped write at a known revision and observe when each hop receives it. This identifies the layer that introduces delay without guessing from a single end-to-end timeout. Test the real HTTPS path as well as the direct endpoint, because a TLS terminator or ingress may use a different route or timeout policy.

## Distinguish idle from disconnected

A watch on an unchanged key can remain quiet legitimately. Setting `progress_notify` asks etcd for progress notifications, but their timing is server-controlled and is not a promise of a heartbeat at your preferred interval. Do not set a short idle deadline based on an assumed notification cadence.

Track connection state, the time of the last complete response, and the last applied revision separately. A transport error or EOF requires reconnecting. An HTTP success status at stream creation does not guarantee the stream will remain healthy; a later failure can be represented in the streaming response body.

Use a bounded reconnect policy with backoff and jitter. A deliberate maximum stream lifetime can also be useful, provided every replacement resumes from a stored revision instead of silently starting at the current moment. Application cancellation should close the response body so the server and client can release the stream.

## Resume without introducing a state gap

To build a cache, first read the desired key or prefix and record that range response's header revision. Start the watch at `revision + 1` using `start_revision` as a decimal string. A prefix watch also needs the appropriate base64-encoded `range_end`; use the client library's prefix-end calculation or a carefully tested byte-range helper.

For each event response, apply complete revisions and persist the resulting state with its cursor. On reconnect, request the next unapplied revision. Do not advance from the header of a creation acknowledgement while older events may still be queued for delivery.

If cancellation reports a compacted revision, reload a consistent snapshot and start at its revision plus one. Compacted intermediate events cannot be recovered from the watch API. If the application requires every event rather than reconstructed current state, its durable event-retention design must cover that requirement.

## Carry authentication through the actual gateway

For HTTPS, provide the CA and client certificate options needed by the listener. When etcd RBAC authentication is enabled, obtain and supply the gateway's supported authentication token in the `Authorization` header. The gateway documentation explicitly notes that TLS Common Name authentication is not supported through this translation path; do not assume a certificate's CN becomes the application's etcd username.

Avoid logging tokens or secret values while troubleshooting. Verify both a successful authorized request and the expected denial for an unauthorized key. Then repeat the streaming test through the exact production proxy path, including a disconnect, reconnect, and compacted-cursor scenario.

## Conclusion

Treat the gateway watch as a sequence of JSON messages, keep every output and proxy layer streaming, and use revisions to reconnect safely. A quiet stream is not automatically broken, and an initial HTTP success is not a substitute for ongoing message and error handling.

## Official Documentation

- [etcd gRPC gateway](https://etcd.io/docs/v3.7/dev-guide/api_grpc_gateway/)
- [etcd Watch API and progress notifications](https://etcd.io/docs/v3.6/learning/api/)
- [etcd watch guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/)
- [curl command options](https://curl.se/docs/manpage.html)
