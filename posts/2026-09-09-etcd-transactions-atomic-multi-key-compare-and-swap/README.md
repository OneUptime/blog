# How to Use etcd Transactions for Atomic Multi-Key Compare-and-Swap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Go, Concurrency, Consistency, Database

Description: Update related etcd keys atomically by comparing their modification revisions, detecting conflicts, and handling uncertain transaction outcomes.

---

Two independent `put` requests cannot atomically publish a deployment's image and configuration version. A reader might observe the new image with the old configuration, and two writers can overwrite each other's decisions. An etcd transaction can compare both keys and write both replacements as one operation.

This tutorial uses the Go v3 client with etcd 3.6 or 3.7. The example keeps the data small and operates on a disposable `/demo/` prefix. The underlying rule is that a transaction evaluates its comparison list and executes either its success branch or its failure branch atomically. All modifications in the transaction receive one store revision. See the official [transaction API](https://etcd.io/docs/v3.6/learning/api/).

## Read a coherent starting point

Imagine two keys:

```text
/demo/deploy/image   = registry.example/app:v1
/demo/deploy/config  = config-17
```

First read both in one read-only transaction. Two separate linearizable reads would each be consistent, but another writer could update the pair between them. The read-only transaction gives the application a coherent pair to use when deciding its replacement values.

For each key, preserve its `ModRevision`. Comparing only its value permits an ABA sequence: another writer can change `v1` to `v2` and back to `v1` without your value comparison detecting the intervening updates. A modification revision comparison detects that history. For a missing key, a comparison against modification revision zero checks absence.

## Implement the conditional update

Create a new Go module and install the approved client release, such as `go get go.etcd.io/etcd/client/v3@v3.7.1`. The following standalone program accepts the replacement image and configuration as arguments. Change the endpoint and supply TLS options for your deployment. The `v3.7.1` client requires Go 1.26 or newer.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"
)

func publish(ctx context.Context, cli *clientv3.Client,
    image, config string) (int64, bool, error) {
    const imageKey = "/demo/deploy/image"
    const configKey = "/demo/deploy/config"

    before, err := cli.Txn(ctx).Then(
        clientv3.OpGet(imageKey),
        clientv3.OpGet(configKey),
    ).Commit()
    if err != nil {
        return 0, false, err
    }
    revision := func(i int) int64 {
        kvs := before.Responses[i].GetResponseRange().Kvs
        if len(kvs) == 0 {
            return 0
        }
        return kvs[0].ModRevision
    }

    after, err := cli.Txn(ctx).If(
        clientv3.Compare(clientv3.ModRevision(imageKey), "=", revision(0)),
        clientv3.Compare(clientv3.ModRevision(configKey), "=", revision(1)),
    ).Then(
        clientv3.OpPut(imageKey, image),
        clientv3.OpPut(configKey, config),
    ).Else(
        clientv3.OpGet(imageKey),
        clientv3.OpGet(configKey),
    ).Commit()
    if err != nil {
        return 0, false, err
    }
    return after.Header.Revision, after.Succeeded, nil
}

func main() {
    if len(os.Args) != 3 {
        log.Fatal("usage: go run . IMAGE CONFIG")
    }
    cli, err := clientv3.New(clientv3.Config{
        Endpoints: []string{"http://127.0.0.1:2379"},
        DialTimeout: 5 * time.Second,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer cli.Close()
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    rev, changed, err := publish(ctx, cli, os.Args[1], os.Args[2])
    if err != nil {
        log.Fatalf("transaction outcome needs reconciliation: %v", err)
    }
    fmt.Printf("succeeded=%t revision=%d\n", changed, rev)
}
```

The `Else` branch returns current values without modifying the store. Production code can return those values to a caller for a conflict message or a fresh decision. A response with `Succeeded == false` is a normal comparison conflict, not a transport error.

Run the program with a planned release:

```bash
go run . registry.example/app:v2 config-18
etcdctl get /demo/deploy/ --prefix --write-out=json
```

The two changed keys should have the same `mod_revision`. A coherent reader should fetch the pair with a read-only transaction or a single prefix range, rather than making independent reads and assuming they describe the same moment.

## Decide what a retry means

On a comparison conflict, retry only after rereading and deciding whether the proposed update is still valid. Add a bounded retry count and randomized backoff for workloads with contention. Otherwise several writers can repeatedly collide while issuing more work to an already busy cluster.

A deadline or connection error is different: the server may have committed the transaction before the response was lost. Treating that error as proof of failure can duplicate an operation. Setting a release to fixed strings is easier to reconcile than incrementing a counter or transferring a balance, but the application still needs a stated outcome policy.

For operations that must be deduplicated, include an application-generated operation ID in the same transaction. Compare that operation marker's version with zero and write the marker alongside the data changes. On an uncertain outcome, read the marker linearly before deciding whether to retry. Retain markers long enough to cover every supported retry window, and bind each marker to the original request contents so that ID reuse cannot accept a different operation.

## Stay within the transaction's boundary

An etcd transaction only makes etcd operations atomic. It does not atomically update a container registry, a SQL database, or a remote API. If publishing these keys triggers deployment work, use idempotent reconciliation or an outbox-style design appropriate to the downstream system.

Avoid writing the same key twice inside one transaction branch. Validate request sizes and operation counts against your server's configured limits before turning this pattern into a bulk update facility. Prefix permissions must cover every comparison and requested operation; a narrowly authorized application should not need the root role for this workflow.

For a rollback, read the current pair and use another conditional transaction to publish the previous pair. A blind rollback could overwrite a later valid release. Preserve the release's original values and observed revisions in your deployment record so the rollback can detect concurrent work.

## Verify contention deliberately

In a disposable test, pause two writers after their initial read, then allow both to commit. Exactly one should succeed from the same starting revisions. Add a reader that continuously fetches the prefix and checks that image/config pairs come from the same release. Finally, inject a client cancellation around commit and verify that reconciliation does not assume an error means no write occurred.

## Conclusion

Use a coherent read, compare each key's modification revision, and write related keys in one transaction. Handle comparison conflicts and uncertain transport outcomes separately, and keep external side effects outside assumptions about etcd's atomicity.

## Official Documentation

- [etcd transaction and comparison API](https://etcd.io/docs/v3.6/learning/api/)
- [etcd API operation guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/)
- [Go transaction client](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/txn.go)
