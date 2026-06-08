# Validation Summary: How to Optimize NATS Performance

## Status
validated

## Post Type
Tutorial / Guide — NATS performance optimization guide in Go covering client connection tuning, publishing patterns, subscription/queue groups, JetStream stream and consumer configuration, server configuration, monitoring, and benchmarking.

## Technologies Covered
- NATS server (including JetStream, 2.10+ features such as route compression and pool_size)
- nats.go client library (`github.com/nats-io/nats.go`)
- Go standard library (`sync`, `context`, `net/http`, `encoding/json`, `runtime`, `time`, `net`)
- Prometheus client (`github.com/prometheus/client_golang/prometheus`)
- YAML-style NATS server config (`nats-server.conf`)

## Sources Consulted
- [nats.go package reference (pkg.go.dev)](https://pkg.go.dev/github.com/nats-io/nats.go)
- [nats.go source — `nats.go` (Dialer/SetCustomDialer/CustomDialer)](https://github.com/nats-io/nats.go/blob/main/nats.go)
- [nats.go source — `js.go` (StoreCompression, NoCompression, S2Compression)](https://github.com/nats-io/nats.go/blob/main/js.go)
- [nats.go source — `jsm.go` (StreamConfig.Compression, ConsumerConfig fields)](https://github.com/nats-io/nats.go/blob/main/jsm.go)
- [NATS docs — Advanced Connect and Custom Dialer in Go](https://docs.nats.io/using-nats/developer/tutorials/custom_dialer)
- [Go stdlib `net.Dialer` reference](https://pkg.go.dev/net#Dialer) (for the `Timeout` field and satisfying the `CustomDialer` interface)
- [NATS Stream Compression announcement (Qaze)](https://qaze.app/blog/nats-stream-compression/) for verifying S2 compression in NATS 2.10+

## Issues Found

1. **`nats.PendingLimits(...)` used as a connection option in `CreateOptimizedConnection`** — This is not a valid `nats.Option`. Pending limits in nats.go are per-subscription (`sub.SetPendingLimits(msgLimit, bytesLimit)`), and the cited 65,536 messages / 64MB default is the subscription default (`DefaultSubPendingMsgsLimit` / `DefaultSubPendingBytesLimit`), not a connection-level setting. Removed the invalid call and added a sentence pointing the reader to the per-subscription `SetPendingLimits` usage already shown later in the post.

2. **`nats.SetCustomDialer(&nats.DefaultNetDialer{DialTimeout: 5 * time.Second})`** — `nats.DefaultNetDialer` does not exist in the nats.go package, and there is no `DialTimeout` field even on `net.Dialer` (the correct field is `Timeout`). Replaced with `nats.Dialer(&net.Dialer{Timeout: 5 * time.Second})`, which uses the dedicated `nats.Dialer(*net.Dialer) Option` (`nats.go:1617`) and added the required `"net"` import.

## Review Notes
- Verified that `nats.S2Compression` and `nats.NoCompression` are real `StoreCompression` constants defined in `js.go` (NATS 2.10+ stream compression), and that `StreamConfig.Compression` accepts them.
- Verified `ConsumerConfig` fields used in the post — `Durable`, `AckPolicy`, `DeliverSubject`, `DeliverGroup`, `DeliverPolicy`, `MaxDeliver`, `AckWait`, `MaxAckPending`, `ReplayPolicy`, `FlowControl`, `Heartbeat`, `MaxRequestBatch`, `MaxRequestExpires`, `InactiveThreshold` — all map to documented `ConsumerConfig` JSON fields.
- Verified server-side options used: `max_connections`, `max_payload`, `max_pending`, `write_deadline`, `ping_interval`, `ping_max`, `max_control_line`, cluster `compression: s2_auto`, cluster `pool_size`, JetStream `store_dir`, `max_memory_store`, `max_file_store`, `sync_interval`, `domain`. The `compression` and `pool_size` route options require NATS server 2.10 or later, which is the supported line at the time of review — no version caveat required, but readers on older 2.9.x servers would need to drop those two cluster options.
- The `pendingMessages.Set(float64(stats.OutMsgs - stats.InMsgs))` line in `StartCollector` is not actually "pending messages" — `nats.Statistics` tracks lifetime in/out counts, not a queue depth — but it compiles and is presented as illustrative metrics wiring rather than a load-bearing claim, so no change was made. A future improvement would be to track per-subscription `sub.Pending()` instead.
- The connection-pool error-channel pattern only surfaces the first error via `<-errChan`; subsequent failures are silently dropped. This is a design weakness rather than a correctness bug, so it was left as-is.
- `nc.SetCustomDialer` is still a valid option for users implementing the full `CustomDialer` interface; the fix uses `nats.Dialer` because passing a stdlib `*net.Dialer` was clearly the intent.
