# Validation Summary: How to Recover an etcd Watch After Revision Compaction

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- etcd 3.6 and 3.7, MVCC revisions, compaction, and prefix watches
- Go and the etcd v3 Go client (v3.7.1)
- Consistent in-memory caches, atomic persistence, and event processing

## Sources Consulted
- [etcd API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/): history retention, ordering, complete revisions, resumability, and progress notifications.
- [etcd Range and Watch API](https://etcd.io/docs/v3.6/learning/api/): response revisions, historical reads, watch start revisions, and compaction cancellation.
- [etcd v3.6.0 Go watch implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/watch.go): terminal errors, reconnections, leader requirements, and fragment assembly. Read through the corresponding raw GitHub URL when the rendered page could not be retrieved.
- [etcd v3.7.1 Go watch implementation](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/watch.go): error handling, watch-created acknowledgements, and fragment assembly before dispatch.
- [etcd v3.7.1 client options](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/op.go): WithPrefix, WithRev, and WithFragment.
- [etcd v3.7.1 client configuration](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/config.go): endpoints, dial timeout, TLS, and credentials.
- [etcd v3.7.1 client module](https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/go.mod): module path and Go 1.26 minimum.
- [Go Modules Reference](https://go.dev/ref/mod#go-get): version-pinned dependency installation.
- [Go os/signal documentation](https://pkg.go.dev/os/signal#NotifyContext): signal-driven context cancellation.

## Issues Found
- The fragmentation caveat did not distinguish application responsibilities from the Go client's built-in assembly. Clarified that WithFragment() responses are reassembled by the Go client, while raw Watch RPC consumers must assemble fragments before applying a complete revision. Both reviewed client versions merge fragments before delivering the response to the application.

## Review Notes
- Extracted the exact Go example into a temporary module outside the repository. The documented `go get go.etcd.io/etcd/client/v3@v3.7.1` command succeeded, automatically selecting Go 1.26.8 from the installed Go 1.25.3 toolchain. `go build ./...` succeeded.
- Reviewed snapshot replacement, delete handling, the snapshot header revision plus one boundary, watch error handling, and context cleanup. The sample uses supported APIs and makes a default linearizable prefix read.
- The header revision rule applies to the fresh latest read shown. For pagination, subsequent reads must retain the initially pinned revision rather than adopting newer response headers.
- Gap-free continuation depends on the required history remaining available. If compaction catches recovery again, another complete snapshot is required, as discussed in the post. Recovery cannot restore intermediate events already removed by compaction.
- The example intentionally owns its map in one goroutine and does not expose it to readers or persist it. A failed snapshot read returns an error and ends the demonstration; production retry policy would need to account for transient read failures.
- Atomic state/cursor persistence and idempotent external effects are appropriate. A crash between separate persistence operations is a negative test for an incorrectly split commit; a correct local transaction has no separately committed state/cursor boundary.
- No live etcd cluster or crash/partition integration tests were run. Runtime behavior was reviewed against official API contracts and client source; compilation was verified for v3.7.1.
- The documentation links target the intended resources. The author attribution link is unrelated to the technical claims.
