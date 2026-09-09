# How to Recover an etcd Watch After Revision Compaction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Go, Consistency, Watch, Troubleshooting

Description: Rebuild an etcd prefix cache at a fixed revision, then resume its watch without a snapshot-to-watch gap after compaction.

---

An etcd watch can resume from an older revision only while that revision remains in retained history. If the server returns `etcdserver: mvcc: required revision has been compacted`, retrying the same revision cannot recover the missing history. Fetch a fresh consistent snapshot, replace your local state, and watch from the snapshot revision plus one.

This guarantees that a state cache converges without a gap between its new snapshot and subsequent changes. It cannot reconstruct every intermediate event that compaction already removed. A consumer that must retain every transition needs durable event storage and retention designed for its outage budget. The distinction follows from etcd's documented [watch guarantees and history window](https://etcd.io/docs/v3.6/learning/api_guarantees/).

## Understand the revision boundary

Suppose your consumer last processed revision 500, compaction advanced to 800, and a new prefix read returns revision 950. The new read contains the state at 950. Starting the replacement watch at 951 captures changes made after that read, including changes that happen before the watch connection finishes opening.

Do not perform an unversioned read followed by a watch that starts at the current time. A write between those two requests could disappear from the consumer's view. Also replace the entire cached prefix: merging only returned keys would leave keys that were deleted during the outage.

A snapshot revision is the response header revision, not the maximum `mod_revision` among returned keys. A prefix might have no keys, or its most recently modified key might be much older than the cluster's current revision.

## Build a recoverable cache

The following Go program uses the v3 client API supported by etcd 3.6 and 3.7. It assumes a disposable local server on port 2379. Install a client version matching your approved server release, for example `go get go.etcd.io/etcd/client/v3@v3.7.1`, inside a new Go module. Configure TLS and credentials through `clientv3.Config` for an authenticated deployment. The `v3.7.1` client requires Go 1.26 or newer.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "os/signal"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"
)

func run(ctx context.Context, cli *clientv3.Client) error {
    const prefix = "/demo/config/"
    for ctx.Err() == nil {
        readCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
        snapshot, err := cli.Get(readCtx, prefix, clientv3.WithPrefix())
        cancel()
        if err != nil {
            return fmt.Errorf("load snapshot: %w", err)
        }

        next := make(map[string]string, len(snapshot.Kvs))
        for _, kv := range snapshot.Kvs {
            next[string(kv.Key)] = string(kv.Value)
        }
        cache := next // Replace, rather than merge, the old prefix.
        applied := snapshot.Header.Revision
        log.Printf("snapshot revision=%d keys=%d", applied, len(cache))

        watchCtx, stopWatch := context.WithCancel(
            clientv3.WithRequireLeader(ctx),
        )
        stream := cli.Watch(watchCtx, prefix,
            clientv3.WithPrefix(), clientv3.WithRev(applied+1))
        for response := range stream {
            if err := response.Err(); err != nil {
                log.Printf("watch ended; compact_revision=%d error=%v",
                    response.CompactRevision, err)
                break
            }
            for _, event := range response.Events {
                key := string(event.Kv.Key)
                switch event.Type {
                case clientv3.EventTypePut:
                    cache[key] = string(event.Kv.Value)
                case clientv3.EventTypeDelete:
                    delete(cache, key)
                }
            }
            if n := len(response.Events); n > 0 {
                applied = response.Events[n-1].Kv.ModRevision
                log.Printf("applied revision=%d keys=%d", applied, len(cache))
            }
        }
        stopWatch()
        // A closed/canceled stream triggers a fresh snapshot.
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(time.Second):
        }
    }
    return ctx.Err()
}

func main() {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
    defer stop()
    cli, err := clientv3.New(clientv3.Config{
        Endpoints: []string{"http://127.0.0.1:2379"},
        DialTimeout: 5 * time.Second,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer cli.Close()
    if err := run(ctx, cli); err != nil && ctx.Err() == nil {
        log.Print(err)
    }
}
```

This is a single-owner in-memory cache demonstration. To serve concurrent readers, publish snapshots and apply each complete revision under a mutex or through an immutable state pointer. Do not expose a partially applied multi-key transaction. The program deliberately reloads after a terminal stream error; the Go client also handles many transport reconnections internally.

## Persist state and cursor together

For a durable consumer, commit the derived state and its applied revision in the same local transaction. On restart, request revision `applied + 1`. If the process crashes after an external side effect but before saving its cursor, it may see the event again. Use idempotency keys or transactional output handling when repeated delivery matters.

Do not advance the cursor from the header of a watch-created acknowledgement. It can describe a server revision beyond historical events still being delivered. Track fully applied event revisions, and only use progress responses as checkpoints when you have implemented their documented semantics. With default unfragmented watch responses, updates in one revision are delivered together; custom fragmentation requires additional assembly logic.

For a large prefix, paginate the replacement snapshot at one pinned revision. Build it privately and publish only when all pages finish. If compaction overtakes the pinned revision during pagination, discard the partial result and restart the read. Publishing a partial snapshot would turn a recovery procedure into a source of missing keys.

## Verify the failure boundary

In a disposable cluster, create a key under `/demo/config/`, record the current revision, change and delete keys, and compact beyond the recorded cursor. A watch started at the old cursor should report compaction. Restart the cache and confirm the deleted keys stay absent and later puts arrive.

Also test a transaction that changes several keys at one revision, a connection interruption, and a crash between state persistence and cursor persistence. Compare the recovered state against a fresh prefix read taken at the same revision. A wall-clock comparison against a changing prefix can produce false discrepancies.

If compaction happens repeatedly during recovery, measure snapshot duration and event-processing lag. Increase the appropriate retention window or reduce consumer workload after establishing the cause. Continuously retrying a doomed old revision only delays convergence.

## Conclusion

Recover a compacted watch by replacing the cache with a consistent prefix snapshot and starting at its header revision plus one. Keep state and cursor updates atomic, make repeated processing safe, and distinguish reconstructing current state from recovering an event history that no longer exists.

## Official Documentation

- [etcd API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/)
- [etcd Range and Watch API](https://etcd.io/docs/v3.6/learning/api/)
- [Go watch client implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/watch.go)
