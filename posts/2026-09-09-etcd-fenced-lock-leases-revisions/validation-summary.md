# Validation Summary: How to Build a Fenced Distributed Lock with etcd Leases and Revisions

## Status

validated

## Post Type

Tutorial with a complete Go helper and PostgreSQL schema and write examples.

## Technologies Covered

- etcd 3.6 and 3.7: leases, concurrency mutexes, MVCC revisions, transactions, and snapshot recovery.
- Go and the etcd v3.7.1 client: contexts, session lifecycle, and cleanup.
- PostgreSQL: conditional updates, row concurrency, and fencing tokens.
- JSON numeric precision and exact signed 64-bit token transport.

## Sources Consulted

- etcd v3.7.1 mutex implementation: https://github.com/etcd-io/etcd/blob/v3.7.1/client/v3/concurrency/mutex.go
- etcd v3.7.1 session implementation: https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/concurrency/session.go
- etcd v3.7.1 client module and Go requirement: https://raw.githubusercontent.com/etcd-io/etcd/v3.7.1/client/v3/go.mod
- etcd MVCC data model: https://etcd.io/docs/v3.6/learning/data_model/
- etcd API guarantees: https://etcd.io/docs/v3.7/learning/api_guarantees/
- etcd disaster recovery and revision bumps: https://etcd.io/docs/v3.7/op-guide/recovery/
- etcd 3.6-to-3.7 upgrade guidance: https://etcd.io/docs/v3.7/upgrades/upgrade_3_7/
- PostgreSQL UPDATE syntax and RETURNING: https://www.postgresql.org/docs/current/sql-update.html
- PostgreSQL transaction isolation and concurrent UPDATE condition rechecks: https://www.postgresql.org/docs/current/transaction-iso.html
- Go module dependency commands: https://go.dev/ref/mod#go-get
- RFC 8259, section 6, JSON number interoperability: https://www.rfc-editor.org/rfc/rfc8259

## Issues Found

- Recovery ordering was specified only against the downstream high-water mark. That can be lower than an already issued token in a delayed write. For example, if the resource has accepted 100 but an old worker holds 200, a recovered owner using 150 can still be overwritten by the delayed 200. Corrected the recovery paragraph to require a revision bump above every previously issued token, prevent further token issuance by the old cluster, and explicitly enforce any cluster-generation epoch downstream. This follows from the documented revision rollback behavior and the example's numeric comparison. No sections were added or restructured.

## Review Notes

- Extracted the exact Go code into an isolated temporary module requiring client v3.7.1. `go test -mod=mod ./...` passed with no test files, verifying compilation and API compatibility; it does not constitute a runtime integration test. No repository dependency files were added.
- The pinned client module declares Go 1.26, confirming the stated minimum. The dependency command is valid within an initialized Go module. The helper uses supported APIs.
- Mutex acquisition orders contenders by key creation revision and attaches the key to the session lease. A fresh session per helper invocation avoids sharing ownership between concurrent callers. `IsOwner()` compares the key's creation revision for use in an etcd transaction.
- Session cancellation is advisory for external work. The post correctly explains the gap between lease expiry and downstream acceptance of a newer token. `Session.Close()` ends keepalive and attempts revocation using a timeout derived from the configured TTL and parent context.
- PostgreSQL's conditional UPDATE is appropriate for the single-row example. At Read Committed, PostgreSQL rechecks the condition after waiting for a concurrent updater; stronger isolation can instead produce a serialization failure, which callers must treat as an error. An explicit transaction must commit before a write is considered durable.
- Equal tokens intentionally permit repeated writes within one ownership generation; operation ordering and idempotency remain separate concerns. The persistent high-water mark must also survive resource lifecycle changes and downstream recovery.
- Reviewed SQL syntax and concurrency semantics against official documentation; did not execute PostgreSQL statements or the two-worker lease-expiry, cancellation, key-loss, or recovery scenarios against live services.
- The linked v3.7.1 mutex source and documentation pages resolved. Retrieval of the older v3.6.0 session source link failed in the browsing tool; its path is plausible, and session behavior was verified against the retrieved v3.7.1 source used by the example. No broken-link conclusion was inferred from that retrieval failure.
- Exact integer or decimal-string token transport is appropriate because binary64 JSON consumers cannot preserve all signed 64-bit integer values.
