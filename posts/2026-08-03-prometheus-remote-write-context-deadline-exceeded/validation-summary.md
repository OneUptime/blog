# Validation Summary: Remote Write Context Deadline Exceeded: Finding the Bottleneck

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Prometheus 3.13.1
- Prometheus Remote Write and its sharded WAL-backed queue
- Prometheus Remote Write 2.0 retry semantics
- PromQL
- Prometheus YAML configuration
- Go HTTP request contexts and X.509 verification
- curl, OpenSSL, and glibc `getent`
- DNS, TCP, TLS, HTTP proxies, packet loss, and Path MTU Discovery

## Sources Consulted
- Prometheus download page, used to identify 3.13.1 as the current release on the validation date - https://prometheus.io/download/
- Prometheus 3.13 configuration reference for `remote_timeout`, `max_shards`, `max_samples_per_send`, `batch_send_deadline`, `min_backoff`, `max_backoff`, and TLS client settings - https://prometheus.io/docs/prometheus/3.13/configuration/configuration/#remote_write
- Prometheus Remote Write tuning guide for the WAL-to-shard queue flow, queue blocking, capacity guidance, and automatic shard calculation - https://prometheus.io/docs/practices/remote_write/
- Prometheus 3.13.1 Remote Write HTTP client implementation for request-context creation, timeout scope, and recoverable network errors - https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/client.go
- Prometheus 3.13.1 queue manager implementation for metric names, retry/backoff behavior, per-attempt latency measurement, queue blocking, and reshard suppression after recoverable errors - https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/queue_manager.go
- Prometheus Remote Write 2.0 specification, especially Retries & Backoff and receiver acknowledgement semantics - https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff
- Prometheus 3.13 PromQL function and operator references for `rate`, `histogram_quantile`, `time`, aggregation, and subtraction - https://prometheus.io/docs/prometheus/3.13/querying/functions/ and https://prometheus.io/docs/prometheus/3.13/querying/operators/
- Prometheus metric type tutorial for `go_memstats_heap_alloc_bytes` and histogram querying - https://prometheus.io/docs/tutorials/understanding_metric_types/
- curl command-line reference for `--silent`, `--show-error`, `--output`, `--write-out`, and the cumulative timing variables - https://curl.se/docs/manpage.html
- OpenSSL `s_client` reference for `-connect` and `-servername` - https://docs.openssl.org/master/man1/openssl-s_client/
- Linux `getent(1)` manual for the `ahosts` database - https://man7.org/linux/man-pages/man1/getent.1.html
- Go `crypto/x509` verifier source, which states that `Certificate.Verify` does not perform revocation checking - https://go.dev/src/crypto/x509/verify.go
- RFC 2923, TCP Problems with Path MTU Discovery, for the small-request/bulk-transfer behavior of PMTU black holes - https://www.rfc-editor.org/rfc/rfc2923

## Issues Found
- curl reports `time_namelookup`, `time_connect`, and `time_appconnect` as cumulative times from the start of the transfer. The post attributed a large raw `time_connect` directly to connection setup. Changed the interpretation to use `time_connect - time_namelookup` for TCP or proxy connection establishment.
- The TLS section suggested that an inaccessible certificate-revocation dependency could make Prometheus wait. Go's X.509 verifier does not perform revocation checking by default, so removed that cause while retaining valid stalled-handshake and middlebox causes.
- The sender-pressure section implied that WAL reading, marshaling, and compression consume the configured HTTP request deadline. In Prometheus 3.13.1, the body is marshaled and compressed before the client creates the `remote_timeout` context. Clarified that pre-request work delays queue progress and that CPU starvation can still consume wall-clock time after the HTTP operation starts.
- The proxy test said an empty POST is always rejected before ingestion. Receiver behavior is implementation-specific, so changed this to say it may be rejected and retained the valid warning that an empty POST is not an ingestion performance test.
- The concurrency section omitted that Prometheus suppresses resharding while recoverable send errors are active. Added that caveat, included actual shard count in the comparison, and limited `max_shards` increases to cases where the desired count is constrained by the maximum.
- The timeout-alignment section allowed intermediary timeouts equal to the new `remote_timeout`, which leaves a boundary race. Changed the guidance so intermediaries permit more than the Prometheus end-to-end request duration.
- The recovery checklist said `enqueue_retries_total` should decline, but it is a counter and cannot decrease except on process restart. Changed the check to require its rate to return to baseline while the pending-sample gauge declines.

## Review Notes
The corrected post matches Prometheus 3.13.1, the current release on 2026-08-04. The cited Remote Write 2.0 specification remains experimental, but the post uses it only as a source for retry/backoff and acknowledgement semantics that agree with the current Prometheus implementation. The `getent ahosts` command is Linux/glibc-specific, and `/-/ready` is an example health path; an equivalent debug image and the receiver's documented readiness endpoint may be required. The OpenSSL command is a handshake and SNI diagnostic, not a full hostname-and-trust validation command.
