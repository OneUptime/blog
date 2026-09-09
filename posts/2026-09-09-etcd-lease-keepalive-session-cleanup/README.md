# How to Manage etcd Lease KeepAlive and Automatic Session Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Go, Concurrency, High Availability, Troubleshooting

Description: Attach ephemeral keys to etcd leases, consume keepalive responses, stop work on session loss, and revoke leases with bounded cleanup.

---

An etcd lease ties one or more keys to a server-managed lifetime. While the lease is kept alive, those keys remain. When the lease expires or is revoked, etcd removes the attached keys. This is useful for service registrations and ephemeral sessions, but the client still has to manage its keepalive stream and local work.

A common leak is creating a new lease after every transient error while leaving old keepalive loops running. Another is writing an intended ephemeral key without attaching the lease at all. Make lease ownership explicit and use one cleanup path for every exit from that ownership scope.

## Define the lifecycle first

The intended sequence is grant, start keepalive, attach keys, perform work, stop keepalive, and revoke. If a process crashes before revocation, lease expiration is the fallback cleanup mechanism. It is not an exact wall-clock deadline for client work, especially during leader changes or cluster unavailability.

The granted TTL may differ from the requested TTL within the server's supported behavior, so inspect the response. Keepalive responses communicate the renewed TTL; a closed channel means the application can no longer assume its session is being refreshed. The official [Lease API](https://etcd.io/docs/v3.6/learning/api/) defines grant, revoke, and keepalive operations.

Choose a TTL that tolerates expected scheduling and network variation while meeting the application's acceptable stale-registration duration. A very short TTL increases the chance that normal pauses look like failures. A very long TTL delays cleanup after a crashed process.

## Use one owner for the keepalive stream

This complete Go example targets the v3 client in etcd 3.6 and 3.7. Create a module and install the approved version, such as `go get go.etcd.io/etcd/client/v3@v3.7.1`. The local endpoint is for a disposable demonstration; configure TLS and credentials for a real deployment. The `v3.7.1` client requires Go 1.26 or newer.

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

func serve(ctx context.Context, cli *clientv3.Client) error {
    grantCtx, cancelGrant := context.WithTimeout(ctx, 5*time.Second)
    lease, err := cli.Grant(grantCtx, 30)
    cancelGrant()
    if err != nil {
        return err
    }
    keepCtx, stopKeepAlive := context.WithCancel(ctx)
    defer func() {
        stopKeepAlive()
        cleanupCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
        defer cancel()
        if _, err := cli.Revoke(cleanupCtx, lease.ID); err != nil {
            log.Printf("revoke failed; expiration remains fallback: %v", err)
        }
    }()

    responses, err := cli.KeepAlive(keepCtx, lease.ID)
    if err != nil {
        return err
    }
    key := fmt.Sprintf("/demo/sessions/%x", lease.ID)
    putCtx, cancelPut := context.WithTimeout(ctx, 5*time.Second)
    _, err = cli.Put(putCtx, key, "worker-ready", clientv3.WithLease(lease.ID))
    cancelPut()
    if err != nil {
        return err
    }
    log.Printf("session key=%s granted_ttl=%d", key, lease.TTL)

    for {
        select {
        case <-ctx.Done():
            return nil
        case response, ok := <-responses:
            if !ok || response == nil || response.TTL <= 0 {
                return fmt.Errorf("lease refresh ended; stop session work")
            }
            log.Printf("keepalive lease=%x ttl=%d", response.ID, response.TTL)
        }
    }
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
    if err := serve(ctx, cli); err != nil {
        log.Print(err)
    }
}
```

The key incorporates the lease ID so independently running demonstration processes do not overwrite the same registration. A production registration can additionally include a stable worker identity and metadata, but its ownership rules must handle two generations of the same worker.

The bounded put occurs before the response-consumer loop begins, which is safe for this short setup operation and 30-second lease example. Longer initialization should drain keepalive responses concurrently from the start. The client source documents how it handles keepalive response channels and stream shutdown; do not depend on leaving a channel unread indefinitely.

## Attach every ephemeral write deliberately

`Grant` does not automatically bind subsequent puts to the new lease. Every intended ephemeral key needs `WithLease(lease.ID)` or the equivalent API field. Inspect the resulting key's lease ID during verification.

Be careful when updating an existing leased key. A normal put without the intended lease relationship can change the key's lifetime. Either attach the correct lease explicitly or use the documented lease-preservation option when that is the intended operation. Keep persistent configuration and ephemeral session keys in separate prefixes so cleanup cannot accidentally remove long-lived data.

For a higher-level session, the Go `concurrency.NewSession` helper manages a lease and drains its keepalive channel. Monitor `Session.Done()` and call `Close()` when the session ends. `Orphan()` stops refresh without immediately revoking; it is useful for specific handoff or uncertain-connection cases, not a generic replacement for cleanup.

## Stop local work when the session is lost

A service registration disappearing does not kill the process that created it. When the keepalive stream ends, stop accepting new session-dependent work and cancel the current work context. Release local resources before creating a replacement session.

Do not simply create a new lease while an older goroutine continues processing under the old ownership assumption. Track a single session generation and ensure that only its owner can start or stop work. Bound reconnect attempts, and distinguish an inability to confirm liveness from proof that another worker has already taken over.

For exclusive writes to another system, a lease alone is insufficient. A paused worker can resume after its lease expires. Use downstream fencing or an equivalent ownership check at the resource that receives the write.

## Verify graceful and crash cleanup

Run the example against a disposable cluster and inspect the prefix:

```bash
etcdctl get /demo/sessions/ --prefix --write-out=json
etcdctl lease list
```

Press Ctrl-C and confirm the key disappears after the explicit revoke. Then repeat with an abrupt process termination that bypasses cleanup; the key should disappear after lease expiration while the cluster is able to process it. Do not assert an exact deletion millisecond based solely on the requested TTL.

Test a revoked lease while the process is running and confirm its response loop exits. Detection may wait for the next keepalive exchange; revocation is not an immediate broadcast to every local worker. Also test repeated starts and stops, checking that lease counts and goroutine counts do not grow without bound. An empty prefix alone does not prove old keepalive loops have stopped if those loops no longer own keys.

Cleanup uses a fresh bounded context because the work context may already be canceled. Log a failed revoke and let expiration remain the fallback; never block process shutdown indefinitely waiting for an unavailable cluster.

## Conclusion

Treat each lease as an owned lifecycle with a drained keepalive stream, explicitly attached keys, and bounded revocation. Stop session-dependent work when refresh ends, and use expiration as cleanup fallback rather than as a guarantee that stale workers cannot act.

## Official Documentation

- [etcd lease API](https://etcd.io/docs/v3.6/learning/api/)
- [Go lease client implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/lease.go)
- [Go session lifecycle](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/concurrency/session.go)
- [Go put options and lease preservation](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/op.go)
