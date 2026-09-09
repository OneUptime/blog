# How to Build a Fenced Distributed Lock with etcd Leases and Revisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Go, Concurrency, Consistency, Database

Description: Use etcd lease-backed mutex ownership and monotonically ordered revisions with downstream fencing to reject stale lock holders.

---

An etcd lease-backed lock coordinates which worker should own a resource. It cannot prevent a paused worker from resuming after its lease expires. If that worker can still send writes to a database or storage service, the resource needs its own way to reject stale ownership.

A fencing token solves the ordering problem when the downstream resource enforces it atomically. Each new lock ownership receives a higher token, and the resource remembers the highest token it has accepted. Once a newer owner has advanced that value, writes carrying older tokens fail.

This tutorial uses the Go v3 concurrency client supported by etcd 3.6 and 3.7. It separates lock acquisition from downstream enforcement because both are necessary.

## Understand the failure being prevented

Suppose worker A acquires a lock and pauses. Its lease expires, so worker B acquires the lock and writes with token 900. Worker A later resumes with token 850. A downstream check that has recorded 900 rejects A's delayed write.

Checking the lease locally before writing is insufficient: the lease can expire between the check and the external write. Canceling work when `Session.Done()` closes improves responsiveness, but a paused process may not observe cancellation promptly.

Fencing has a precise limit. An older write arriving before the resource has accepted any newer token is not rejected merely because its etcd lease expired. If your requirement is immediate revocation at the external resource, you need a protocol that advances or validates ownership there. Do not promise that a lease alone instantly revokes every in-flight operation.

## Use the lock key's creation revision

The etcd concurrency mutex creates an ownership key attached to the session lease. Its creation revision supplies an ordered token for that acquisition. Read that key after acquiring the mutex and use `CreateRevision`; do not generate tokens from timestamps, lease IDs, or a worker-local counter.

The following integration helper is a complete Go package. Install an approved client version, for example `go get go.etcd.io/etcd/client/v3@v3.7.1`. The caller supplies a configured client and a function that forwards the token to the protected system. The `v3.7.1` client requires Go 1.26 or newer.

```go
package fencing

import (
    "context"
    "fmt"
    "log"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"
    "go.etcd.io/etcd/client/v3/concurrency"
)

func WithLock(ctx context.Context, cli *clientv3.Client,
    work func(context.Context, int64) error) error {
    session, err := concurrency.NewSession(cli,
        concurrency.WithTTL(15), concurrency.WithContext(ctx))
    if err != nil {
        return err
    }
    defer func() {
        if err := session.Close(); err != nil {
            log.Printf("session cleanup: %v", err)
        }
    }()
    mutex := concurrency.NewMutex(session, "/demo/locks/report")
    lockCtx, cancelLock := context.WithTimeout(ctx, 10*time.Second)
    err = mutex.Lock(lockCtx)
    cancelLock()
    if err != nil {
        return err
    }
    defer func() {
        cleanupCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
        defer cancel()
        if err := mutex.Unlock(cleanupCtx); err != nil {
            log.Printf("unlock: %v", err)
        }
    }()

    readCtx, cancelRead := context.WithTimeout(ctx, 5*time.Second)
    response, err := cli.Get(readCtx, mutex.Key())
    cancelRead()
    if err != nil {
        return err
    }
    if len(response.Kvs) != 1 {
        return fmt.Errorf("ownership key no longer exists")
    }
    token := response.Kvs[0].CreateRevision
    workCtx, cancelWork := context.WithCancel(ctx)
    defer cancelWork()
    go func() {
        select {
        case <-session.Done():
            cancelWork()
        case <-workCtx.Done():
        }
    }()
    if err := workCtx.Err(); err != nil {
        return err
    }
    return work(workCtx, token)
}
```

The helper uses a new session per ownership scope and a fixed lock prefix for one resource. Applications protecting several resources should make the resource-to-lock mapping explicit. The [mutex implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/client/v3/concurrency/mutex.go) provides the authoritative ownership behavior.

`Session.Close()` stops refresh and attempts revocation. Its context and TTL bound that work; if the caller context is already canceled, expiration may finish cleanup instead. A lost unlock response does not grant permission to continue writing.

## Enforce the token at the protected resource

For example, a PostgreSQL table can store a resource's value and highest accepted token:

```sql
CREATE TABLE protected_resource (
    name text PRIMARY KEY,
    payload text NOT NULL,
    fence_token bigint NOT NULL DEFAULT 0
);
INSERT INTO protected_resource (name, payload)
VALUES ('report', 'initial');
```

Each protected write must atomically test and advance the token. Using a parameterized statement through the database driver:

```sql
UPDATE protected_resource
SET payload = $2, fence_token = $3
WHERE name = $1 AND fence_token <= $3
RETURNING fence_token;
```

Bind `$1` to the resource name, `$2` to the new payload, and `$3` to the etcd token. No returned row means the resource is missing or a newer owner has already fenced this writer out. Treat that as a failed write, not success. PostgreSQL performs the condition and update as one statement; a separate `SELECT` followed by an unconditional `UPDATE` would reintroduce a race.

Allowing equal tokens permits multiple writes by the same ownership generation. If those writes can arrive out of order or be retried, add an operation sequence or idempotency key as appropriate. Fencing across owners does not automatically order operations within one owner.

Every path that mutates the resource must enforce the condition. An administrative endpoint, background worker, or storage API that bypasses it can undermine the guarantee. For a multi-row invariant, enforce the ownership check and all affected writes in the downstream database transaction.

## Keep etcd-only work inside an etcd transaction

If the protected resource is also in etcd, the concurrency mutex exposes `IsOwner()` for a comparison in the same transaction as the writes. That can couple ownership validation with etcd state modification directly. It does not extend that atomicity to an external database call.

Never represent a fencing token as a floating-point number in JSON or another protocol. Use an exact signed 64-bit integer or a decimal string with exact parsing. A rounded token can collapse distinct ownership generations into one value.

## Plan for cluster restore and verify stale-owner rejection

etcd revisions increase within a cluster history. Restoring an old snapshot or replacing the cluster can invalidate an assumption that future revisions exceed every token previously accepted by the external resource. Design a durable cluster-generation epoch or a reviewed revision-bump strategy that exceeds the downstream high-water mark. Keep the protected system fenced during recovery until that ordering is established.

Test with two workers and a real enforcing resource: delay A, let its lease expire, acquire B, successfully write B's higher token, then release A's delayed write. A must fail at the resource. Also test duplicate writes with the same token, cancellation before acquisition, loss of the ownership key, and cluster-recovery epoch handling.

## Conclusion

Use etcd to coordinate ownership and derive an ordered token from the ownership key's creation revision. Enforce that token atomically at every protected write, and include restore epochs and retry semantics in the design so a stale worker cannot bypass the resource's ordering rule.

## Official Documentation

- [etcd mutex implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/client/v3/concurrency/mutex.go)
- [etcd session implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/concurrency/session.go)
- [etcd MVCC data model](https://etcd.io/docs/v3.6/learning/data_model/)
- [PostgreSQL UPDATE](https://www.postgresql.org/docs/current/sql-update.html)
- [etcd disaster recovery and revision bumps](https://etcd.io/docs/v3.7/op-guide/recovery/)
