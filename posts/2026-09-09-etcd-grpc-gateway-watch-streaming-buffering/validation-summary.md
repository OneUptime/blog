# Validation Summary: How to Stream etcd Watches Through the gRPC Gateway Without Buffering

## Status

validated

## Post Type

Tutorial and troubleshooting guide with executable Bash commands and HTTP/JSON request examples.

## Technologies Covered

- etcd 3.6 and 3.7 Watch and KV APIs
- gRPC gateway and HTTP/JSON streaming
- Protocol Buffers JSON mapping and base64 encoding
- curl, jq, and Bash pipelines
- Reverse proxies, TLS, and etcd RBAC authentication
- Revision cursors, snapshot initialization, and compaction recovery

## Sources Consulted

- [etcd 3.7 gRPC gateway](https://etcd.io/docs/v3.7/dev-guide/api_grpc_gateway/) — endpoints, watch envelopes, authentication tokens, and TLS Common Name limitation.
- [etcd 3.6 gRPC gateway](https://etcd.io/docs/v3.6/dev-guide/api_grpc_gateway/) — compatibility of the examples with the other stated version.
- [etcd Watch API](https://etcd.io/docs/v3.6/learning/api/) — request fields, inclusive start revision, progress notifications, cancellation, and compaction.
- [etcd API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/) — ordering, complete revisions, resumability, and progress bookmarks.
- [etcdctl 3.6 reference](https://github.com/etcd-io/etcd/blob/release-3.6/etcdctl/README.md) — key deletion command.
- [curl manual](https://curl.se/docs/manpage.html) — output buffering, timeouts, request data, headers, and error display.
- [jq manual](https://jqlang.org/manual/) — successive JSON inputs, compact output, and flushing after each object.
- [Protocol Buffers JSON format](https://protobuf.dev/programming-guides/json/) — byte encoding, integer strings, and precision limits.
- [NGINX proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) — distinct request/response buffering and upstream read timeout behavior.
- [gRPC gateway streaming handler source](https://raw.githubusercontent.com/grpc-ecosystem/grpc-gateway/v2.26.3/runtime/handler.go) — message delimiters, response flushing, and errors after streaming begins.

## Issues Found

No technical issues found.

## Review Notes

- All three Bash code blocks passed `bash -n`. Every embedded request payload parsed as valid JSON, and both demonstration base64 values were checked locally.
- The watch and put commands match the documented gateway endpoints for both stated etcd versions. The cleanup command is valid for the disposable local server assumed by the tutorial.
- curl output buffering and jq output flushing are correctly treated separately. The pipeline intentionally preserves complete response envelopes. With `pipefail`, the deliberate curl timeout also gives the pipeline a nonzero status.
- The recovery guidance correctly starts after the snapshot or last applied revision, avoids advancing a cursor from a creation acknowledgement during replay, and reloads state after compaction. State and cursor persistence must be coordinated as described.
- Progress notification timing is server-controlled. The expectation of immediate delivery describes the healthy local experiment; etcd does not guarantee a maximum watch delivery latency.
- Ordinary HTTP errors and failures after streaming begins require different handling. The post correctly retains full messages and does not rely on the initial HTTP status alone.
- All four official documentation links resolve to the intended resources. No deprecated endpoint or command option was identified.
- Validation consisted of official documentation/source review and local syntax/data checks. No live etcd cluster, TLS listener, or production proxy integration test was run.
- README.md required no changes.
