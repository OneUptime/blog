# Validation Summary: Prometheus Remote Write Gets HTTP 429: When to Retry and When to Reduce Load

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Prometheus 3.13.2
- Prometheus Remote Write 1.0 and 2.0
- HTTP 429 Too Many Requests and `Retry-After`
- Prometheus Remote Write queue configuration in YAML
- PromQL monitoring and alert expressions
- Rate limiting, exponential backoff, batching, sharding, WAL buffering, and capacity planning

## Sources Consulted
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write 2.0 retry and backoff specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
- [Prometheus Remote Write 1.0 retry and backoff specification](https://prometheus.io/docs/specs/prw/remote_write_spec/#retries--backoff)
- [Prometheus Remote Write tuning guidance](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus 3.13.2 Remote Write HTTP client implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/client.go)
- [Prometheus 3.13.2 queue manager implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/queue_manager.go)
- [Prometheus 3.13.2 queue configuration defaults and validation](https://github.com/prometheus/prometheus/blob/v3.13.2/config/config.go)
- [Prometheus 3.13.2 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.2)
- [RFC 9110, Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)

## Issues Found
- The default-429 description implied that every sample in a rejected batch is always counted as failed. Prometheus parses Remote Write response statistics, so a receiver can report samples already written during a partial write. The post now says that samples not reported as written are counted as failed.
- The structural-throttling example said that the sender inevitably fills its queue without stating the retry-mode assumption. With the default non-retry behavior, 429 batches fail and the queue advances. The post now explicitly scopes queue growth and WAL lag to configurations with 429 retry enabled.

## Review Notes
- All configuration fields, values, duration syntax, and six PromQL expressions were checked with the checksum-verified `promtool` binary from Prometheus 3.13.2; the configuration and rules passed validation.
- `retry_on_http_429` is still marked experimental in the current Prometheus configuration documentation and defaults to `false`.
- Prometheus 3.13.2 accepts both RFC 9110 `Retry-After` forms shown in the post: delay-seconds and an HTTP-date. A missing, invalid, zero, or past value falls back to the configured exponential backoff.
- The highest-sent-timestamp alert assumes the remote stream normally contains current samples. For intentionally idle streams, operators may want to gate it on active ingestion or pending data to avoid interpreting inactivity as lag.
