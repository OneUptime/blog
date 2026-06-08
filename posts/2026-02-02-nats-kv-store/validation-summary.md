# Validation Summary: How to Implement Key-Value Store with NATS

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- NATS server (2.10) and JetStream
- NATS Go client (`github.com/nats-io/nats.go`, new `jetstream` package)
- NATS Node.js client (nats.js v3 modular packages: `@nats-io/transport-node`, `@nats-io/kv`, `@nats-io/jetstream`)
- Docker Compose
- NATS server configuration file format
- NATS official Helm chart (Kubernetes)

## Sources Consulted
- nats.go jetstream KV source and docs: https://github.com/nats-io/nats.go/blob/main/jetstream/kv.go
- nats.go jetstream errors: https://github.com/nats-io/nats.go/blob/main/jetstream/errors.go
- nats.js KV README (v3 modular API): https://github.com/nats-io/nats.js/blob/main/kv/README.md
- NATS official Helm chart values: https://github.com/nats-io/k8s/blob/main/helm/charts/nats/values.yaml
- NATS JetStream KV concept docs: https://docs.nats.io/nats-concepts/jetstream/key-value-store

## Issues Found

1. **`PurgeDeletes` was described incorrectly.** The original comment said it "Purge entire bucket - removes all keys and history." `PurgeDeletes` actually removes the tombstone markers left behind by previous `Delete`/`Purge` calls — it does NOT delete live keys. Updated the comment to describe the real behavior.

2. **Node.js code used the deprecated `nats` package and `js.views.kv` API.** In nats.js v3 the legacy single `nats` package has been split into modular `@nats-io/*` packages, `js.views.kv()` was removed in favour of the `Kvm` class, and `StringCodec` is gone (KV `put` now accepts strings/`Uint8Array` directly and `KvEntry` exposes `.string()` / `.json()` helpers). Rewrote the Setting Up the Client and CRUD Operations examples to use:
   - `connect` from `@nats-io/transport-node`
   - `Kvm` from `@nats-io/kv`
   - `StorageType.File` from `@nats-io/jetstream`
   - `entry.json()` for JSON decoding instead of `JSON.parse(sc.decode(entry.value))`

3. **Helm chart `values.yaml` used the legacy (pre-1.x) chart structure.** The current `nats-io/nats` Helm chart (v1.x+) has been rewritten and no longer accepts top-level `nats:` or `cluster:` keys. Updated to the current structure: settings live under `config.jetstream` and `config.cluster`, and the storage keys are `memoryStore` / `fileStore` (with `pvc.size` for file storage) rather than `memStorage` / `fileStorage`.

4. **`Watch(..., IncludeHistory())` used to "list current keys".** `IncludeHistory()` causes the watcher to emit every retained historical revision for each matching key, not just the latest value. Both `listKeysByPattern` and `discoverServices` only want the current state, so the option was removed — a plain `Watch` already sends the latest value for each matching key followed by a `nil` marker once the initial snapshot is delivered.

## Review Notes
- The Go `acquireLock(kv, lockName, ttl)` example accepts a `ttl time.Duration` parameter but never uses it. Per-message TTL was added in NATS 2.11, but the new `jetstream` package doesn't yet expose a per-key TTL option on `Create`. Left the signature as-is (not strictly incorrect, just unused) rather than expanding scope.
- The Docker Compose example pins `nats:2.10-alpine`. This is fine today; readers running this in late 2026 may want to move to a newer 2.x tag.
- All other Go `jetstream` package usage (`KeyValueConfig` fields, `FileStorage`/`MemoryStorage` constants, `KeyValuePut`/`KeyValueDelete`/`KeyValuePurge` operation types, `ErrKeyNotFound`/`ErrKeyExists` errors, `LastRevision()` delete option, `WatchAll`, `History`, `GetRevision`, `Keys`, `Status` method-set) was verified against the current source and is correct as written.
- The Node.js connection options (`servers`, `reconnect`, `maxReconnectAttempts: -1`, `reconnectTimeWait`) are still valid in `@nats-io/transport-node`.
