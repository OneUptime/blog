# Kubernetes Watch 410 Gone: Relist and Reconcile Current State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API, Watch, Resource Version, Controller, Kubernetes Operator, Client-go

Description: Explain expired Kubernetes watch history and design controllers that recover from 410 Gone by relisting, replacing cached state, and reconciling levels.

---

A Kubernetes watch is a stream of changes after a particular `resourceVersion`, not a permanent event log. API servers are not required to retain every old version. When the version requested by a client is older than the available history, the server may return HTTP `410 Gone`, often described as “too old resource version.”

This is a normal recovery condition that every long-running controller must tolerate. The safe response is to obtain a fresh snapshot, replace local knowledge, and reconcile current state-not retry the expired version forever and not assume missed edge events can be reconstructed.

## Understand the List-Then-Watch Contract

A conventional controller establishes state in two steps:

1. `LIST` the selected resource collection and store the **collection's** `.metadata.resourceVersion`.
2. `WATCH` the same scope and selectors starting from that version.

The watch then reports changes after the snapshot version. Each returned object carries a resource version that the client can retain for reconnection.

Treat `resourceVersion` as opaque. Do not parse it as an integer, calculate lag by subtraction, compare versions from unrelated resources, or invent the “next” value. Use the exact string returned by the API server.

## Why a Previously Valid Version Expires

A 410 commonly appears after:

- a network or load-balancer outage keeps the client disconnected beyond retained history;
- the controller is paused or its event consumer cannot keep up;
- it persisted a resource version and reused it much later;
- API server watch-cache history no longer contains that point; or
- underlying storage compaction removed the required historical revisions.

The load balancer does not create the 410 response, although repeated disconnects can make a client old enough to encounter one. Increasing etcd retention is not a substitute for correct client behavior; servers are explicitly allowed to stop serving old resource versions.

The failure can arrive as the HTTP response that opens a watch or as an `ERROR` event whose object is a Kubernetes `Status` with code 410. Handle both forms.

## Recover with a Fresh Snapshot

The essential recovery loop is language-independent:

```text
repeat until stopped:
    snapshot = LIST(the exact scope and selectors)
    atomically replace local cache with snapshot.items
    resourceVersion = snapshot.metadata.resourceVersion
    enqueue keys whose observed state may need reconciliation

    while connected:
        stream = WATCH(same scope and selectors, resourceVersion)
        if opening the watch fails with HTTP 410:
            break to the outer LIST
        for each event:
            if event is ERROR with code 410:
                break to the outer LIST
            if event is BOOKMARK:
                resourceVersion = event.object.metadata.resourceVersion
                continue
            apply ADDED / MODIFIED / DELETED to the cache
            resourceVersion = event.object.metadata.resourceVersion
            enqueue the affected key

        on ordinary timeout or lost connection:
            reopen WATCH from the last resourceVersion
```

“Replace” matters. If an object was deleted while the watch was disconnected, merging the fresh list into an old cache leaves a ghost object. Compare or atomically replace the complete selected set so absences become visible, then enqueue any keys whose desired outcome may have changed.

Keep the list and watch scopes identical: API group/version/resource, namespace, label selector, and field selector. Changing a selector while reusing the old resource version creates an incoherent cache.

## Make Reconciliation Level-Driven

A controller that requires seeing every transition-“send an action only when event X follows event Y”-cannot recover safely after history is gone. Kubernetes controller design should be level-driven:

```text
desired = read desired objects from informer cache
actual  = observe owned resources or external system

if actual differs from desired:
    move actual toward desired using idempotent operations

requeue on conflict, transient error, or a deliberate resync interval
```

After a relist, the controller may not know whether an object passed through intermediate states. It **does** know the current snapshot and can converge the system. Use object UIDs, owner references, finalizers, status conditions, and idempotency keys where appropriate; do not key irreversible external actions solely to receiving one watch edge.

## Prefer client-go Informers for Controllers

`client-go` already implements the standard pattern. A `Reflector` lists objects, stores the returned resource version, watches subsequent changes, and repeats the list/watch process as needed. A shared informer adds a local cache and lets multiple handlers share one upstream watch. Work queues decouple event ingestion from retrying reconciliation.

Wait for cache synchronization before workers treat lister results as authoritative. Handlers should enqueue stable keys and return quickly; slow network calls in a watch handler can create backpressure. Workers should fetch the latest cached object and reconcile, coalescing repeated notifications naturally.

Choose the right watch helper for non-controller code. `RetryWatcher` can resume timeouts and lost connections from the last version but explicitly cannot recover when that version has fallen out of history. `watch.Until` preserves event ordering and likewise fails on an old resource version. `UntilWithSync` can relist and recover, but may skip intermediate events-appropriate only when the condition is level-driven. For normal controllers, use informers rather than assembling these primitives manually.

Pin the `client-go` minor version according to Kubernetes' compatibility guidance instead of importing an arbitrary latest version.

## Use Bookmarks and Backoff Correctly

Requesting `allowWatchBookmarks=true` lets the server send `BOOKMARK` events that mark progress through a resource version without changing an object. A bookmark can reduce how far a quiet watch must resume after reconnecting, but the server does not promise a bookmark or a fixed delivery interval. It does not eliminate 410 handling.

For normal disconnects, reconnect from the last observed version. For 410, relist. For throttling and transient server failures, use capped exponential backoff with jitter and honor `Retry-After` where supplied. Reset backoff after sustained success. Immediate relist loops across many controller replicas can create a list-watch storm precisely while the API server is recovering.

Paginated LIST requests have a separate expiration case: an old `continue` token can also receive 410. Restart that list from a fresh snapshot rather than combining pages from different snapshots.

## Observe and Test Recovery

Measure watch opens, disconnects by reason, 410 responses, relist duration, list size, queue depth, reconciliation errors, and time since the last successful cache sync. Do not compute numeric resource-version “distance”; it has no portable meaning.

Test the behavior deliberately:

- terminate a watch connection and confirm resume from the last version;
- inject a 410 and confirm exactly one controlled relist path begins;
- delete objects while disconnected and verify stale cache entries disappear;
- mutate objects several times while disconnected and verify final state converges;
- return 429/5xx and verify bounded, jittered backoff; and
- restart the controller with an old persisted version and confirm it recovers.

The success criterion is eventual agreement with the current API state and desired external state, not delivery of every intermediate event.

## Conclusion

`410 Gone` means the server can no longer continue from the requested historical point. Relist the same collection, replace local state, restart the watch from the list's resource version, and reconcile levels idempotently. Informers and work queues provide this machinery for controllers; bookmarks and retries improve efficiency but never remove the need to recover from expired history.

## Official References

- [Kubernetes: API Concepts-Efficient Detection of Changes](https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes)
- [Kubernetes: Resource Version Semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions)
- [Kubernetes client-go: cache Package](https://pkg.go.dev/k8s.io/client-go/tools/cache)
- [Kubernetes client-go: watch Package](https://pkg.go.dev/k8s.io/client-go/tools/watch)
- [Kubernetes: Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes client-go: Compatibility and Versioning](https://github.com/kubernetes/client-go#compatibility-matrix)
