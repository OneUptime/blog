# Validation Summary: How to Implement Object Store with NATS

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- NATS server (Docker image `nats:latest`)
- NATS JetStream — Object Store
- Go client `github.com/nats-io/nats.go` (the new `jetstream` package)
- Node.js client `nats` (npm v2.x, bundled from nats.deno)
- Mermaid diagrams (architecture / sequence / versioning)

## Sources Consulted
- nats.go jetstream Object Store source: https://github.com/nats-io/nats.go/blob/main/jetstream/object.go
- nats.go pkg.go.dev reference: https://pkg.go.dev/github.com/nats-io/nats.go/jetstream
- nats.deno ObjectStore implementation (the basis for npm `nats` v2.x): https://github.com/nats-io/nats.deno/blob/main/jetstream/objectstore.ts
- nats.deno JetStream types (ObjectStoreOptions, ObjectStoreMeta, ObjectResult): https://github.com/nats-io/nats.deno/blob/main/jetstream/types.ts
- NATS docs: https://docs.nats.io/nats-concepts/jetstream/obj_store
- Go stdlib reference for `crypto/sha256` and `hash` packages

## Issues Found

1. **Go `objStore.List(ctx)` iterated as a channel.** In two places (`workWithVersions` and `FileUploadService.List`) the post used `for info := range lister` against the result of `List`. `List` returns `([]*ObjectInfo, error)` — a slice — so single-variable `range` would bind `info` to an `int` index, not an `*ObjectInfo`, and the code would not compile. Switched the first call site to `for _, obj := range objects` and simplified `FileUploadService.List` to return the slice directly.

2. **Go `ObjectStoreStatus.StreamInfo()` does not exist.** The `monitorObjectStore` function called `status.StreamInfo()` and dereferenced `streamInfo.State.Msgs` etc. The Go `ObjectStoreStatus` interface (`jetstream/object.go`) has no `StreamInfo()` method — that field only exists on the Node/Deno side. Replaced with the real methods the Go interface exposes: `Storage()`, `Size()`, `Sealed()`, and `IsCompressed()`.

3. **Go `hashingReader` used a non-existent type `*sha256.Hash`.** The `crypto/sha256` package does not export a `Hash` type; `sha256.New()` returns the `hash.Hash` interface. The struct field, the `&h` pointer, and the `(*h.hasher).Sum(nil)` dereference all would not compile. Added the `hash` import and switched the field to `hash.Hash`, the constructor to pass `h` directly, and the `Sum()` method to call `h.hasher.Sum(nil)`.

4. **Go `Delete` comment claimed idempotency.** The comment said "deleting non-existent objects does not error", but `Delete` calls `GetInfo` first and returns `ErrObjectNotFound` for objects that never existed. Reworded to state the actual behavior.

5. **Node.js used a non-existent `jsm.objects.create()` API.** The npm `nats` v2.x `JetStreamManager` exposes only `consumers`, `streams`, `getAccountInfo`, etc. — there is no `objects` accessor. ObjectStore creation in this client goes through `js.views.os(name, opts)`, which creates the backing stream if it does not exist. Rewrote the Node.js bucket-creation example to use `js.views.os(...)` directly.

6. **Node.js `ttl` was given in milliseconds.** The `ObjectStoreOptions.ttl` field is typed as `Nanos` (nanoseconds). Replaced the raw `24 * 60 * 60 * 1000` with `nanos(24 * 60 * 60 * 1000)` and added `nanos` to the import.

7. **Node.js `os.put(meta, Buffer)` would not work.** The `put` method requires a `ReadableStream<Uint8Array>`; the separate `putBlob(meta, Uint8Array)` is the API for raw bytes. Both `os.put(...)` calls in the storage example were switched to `os.putBlob(...)`.

8. **Node.js `headers` passed as a plain object.** `ObjectStoreMeta.headers` is typed as `MsgHdrs`, not a `Record<string, string>`. A plain object would not satisfy the type and would not serialize correctly. Imported the `headers` factory from `nats` and built the headers via `h.set(...)`.

9. **Node.js `const data = await result.data`.** `result.data` is a `ReadableStream<Uint8Array>`, not a `Promise`, so `await`-ing it just hands back the stream and `data.toString()` would print `[object ReadableStream]`. Replaced with an `await`-of-chunks pattern that concatenates the stream into a `Buffer` before calling `toString()`.

## Review Notes
- The Docker invocation (`docker run ... nats:latest -js -m 8222`) is correct: `-js` enables JetStream and `-m 8222` enables the HTTP monitoring endpoint. For real persistence you would typically also pass `-sd /data` plus a mounted volume, but the in-memory example is fine for a tutorial walkthrough.
- The new modular `@nats-io/obj` package uses a different entry point (`new Objm(nc).create(...)`) — the post intentionally targets the older monolithic `nats` npm package, which is consistent with the import style used throughout. If the author later wants to update to the modular packages, the Node.js section will need to be revisited.
- Several smaller snippets (e.g., `retrieveBytes`, `storeFile`) rely on imports such as `errors` and `os` that are not shown in their local snippet header. This is normal for illustrative snippets and was left alone.
- The watcher example correctly relies on the documented convention that `Updates()` sends a `nil *ObjectInfo` to signal that the initial state replay is complete.
- The `AddLink` call uses an `ObjectInfo` literal with `Name` (via the embedded `ObjectMeta`) and `Bucket` set — both reachable fields, so the code is valid.
