# How to Page Through an etcd Prefix at a Consistent Revision

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Go, Consistency, Database, Performance

Description: Page through large etcd prefixes with bytewise range boundaries, fixed revisions, and recovery from compaction without mixing snapshots.

---

A large etcd prefix should usually be read in bounded pages. But pagination is only correct if later pages use the same store revision as the first page. Otherwise concurrent inserts, deletes, and updates can make the assembled result describe a state that never existed.

The v3 Range API supplies the pieces: a half-open key range, a result limit, ascending key order, a revision, and a `more` flag. This tutorial combines them into a Go prefix reader for etcd 3.6 and 3.7. Use it for bounded administrative exports or cache initialization, rather than storing unbounded application datasets in etcd.

## Use byte ranges, not string guesses

An etcd range includes its starting key and excludes `range_end`. For a prefix such as `/demo/items/`, the Go client's `GetPrefixRangeEnd` computes the smallest upper bound that includes every key beginning with those bytes. It also handles binary boundary cases that hand-written string arithmetic often misses.

After each page, continue at the last returned key plus a zero byte. That is the smallest byte string strictly greater than the last complete key. If the last key is `a`, the next start is `a\x00`, so the next request excludes `a` without skipping valid longer keys such as `a\x00` or `aa`.

Do not increment the last character as a cursor. Incrementing `a` to `b` would skip every remaining key whose name begins with `a`. Shell strings cannot contain a zero byte, which is another reason to use the client library for a general cursor. These range rules are defined in the [etcd Range API](https://etcd.io/docs/v3.6/learning/api/).

## Pin every page after the first

The first request performs the default linearizable read and captures its response header revision. Every later request explicitly asks for that revision. Sorting by key makes the cursor stable. Avoid sorting pages by value or modification revision while advancing a key cursor, because those orderings do not match the traversal boundary.

This complete program buffers a bounded demonstration export and prints only after all pages succeed. Initialize a Go module and install your approved client, for example `go get go.etcd.io/etcd/client/v3@v3.7.1`. The `v3.7.1` client requires Go 1.26 or newer.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "time"

    mvccpb "go.etcd.io/etcd/api/v3/mvccpb"
    clientv3 "go.etcd.io/etcd/client/v3"
)

func readPrefix(ctx context.Context, cli *clientv3.Client,
    prefix string, pageSize int64) ([]*mvccpb.KeyValue, int64, error) {
    if prefix == "" || pageSize <= 0 {
        return nil, 0, fmt.Errorf("nonempty prefix and positive page size required")
    }
    start := prefix
    end := clientv3.GetPrefixRangeEnd(prefix)
    var revision int64
    var result []*mvccpb.KeyValue
    for {
        options := []clientv3.OpOption{
            clientv3.WithRange(end),
            clientv3.WithLimit(pageSize),
            clientv3.WithSort(clientv3.SortByKey, clientv3.SortAscend),
        }
        if revision != 0 {
            options = append(options, clientv3.WithRev(revision))
        }
        pageCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
        page, err := cli.Get(pageCtx, start, options...)
        cancel()
        if err != nil {
            return nil, 0, err // Discard partial results.
        }
        if revision == 0 {
            revision = page.Header.Revision
        }
        result = append(result, page.Kvs...)
        if !page.More {
            return result, revision, nil
        }
        if len(page.Kvs) == 0 {
            return nil, 0, fmt.Errorf("more=true with an empty page")
        }
        last := page.Kvs[len(page.Kvs)-1].Key
        start = string(last) + "\x00"
    }
}

func main() {
    cli, err := clientv3.New(clientv3.Config{
        Endpoints: []string{"http://127.0.0.1:2379"},
        DialTimeout: 5 * time.Second,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer cli.Close()
    ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
    defer cancel()
    kvs, revision, err := readPrefix(ctx, cli, "/demo/items/", 100)
    if err != nil {
        log.Fatal(err)
    }
    output := struct {
        Revision int64              `json:"revision"`
        KVs      []*mvccpb.KeyValue `json:"kvs"`
    }{revision, kvs}
    if err := json.NewEncoder(os.Stdout).Encode(output); err != nil {
        log.Fatal(err)
    }
}
```

The example rejects an empty prefix deliberately. An all-key export deserves an explicit permission and size decision, as well as the correct sentinel range. Standard Go JSON encoding represents byte slices as base64, preserving binary keys and values rather than corrupting them through text conversion.

## Bound memory and load

Pagination bounds individual responses, not total memory in the example. For a larger export, write each page into a temporary file or private staging table, and publish that artifact only after the final page. Store the captured revision in its metadata. A partially written file should not appear to readers as a complete export.

Choose a page size based on bytes and observed latency, not only the number of keys. One hundred large values may cost more than thousands of small ones. Keep request deadlines, an overall export deadline, and an upper bound on total bytes. The server's request limits and your client's receive-message settings also affect how large a response can be.

A historical read does not pin history in the server. If compaction removes the requested revision before the export finishes, the next request fails. Discard the partial export and restart from a fresh first page. Replacing only the failed page with a current read would mix snapshots. Repeated compaction failures mean the export duration and retention policy need attention.

## Verify with boundary keys and concurrent writes

Populate a test prefix with more keys than one page, including names where one is a prefix of another. Set the page size to one to exercise every cursor transition. Include binary keys in a client-level test if your application permits them.

While the reader traverses pages, run a writer that adds a key in an earlier page's range, deletes a later key, and changes an existing value. The export should still represent its original revision. For a small test dataset, compare it with a single prefix read using that same revision before compaction removes it.

Also test an empty prefix result and compaction during traversal. Confirm that callers receive an error without a partial result. If the result initializes a watch cache, begin the watch at the completed export revision plus one, and be prepared to relist if that watch revision has already been compacted.

## Conclusion

Keep pagination ordered by key, advance with the last key plus a zero byte, and retain the first response's revision for every page. Publish only a complete result and restart the entire traversal when compaction removes its historical snapshot.

## Official Documentation

- [etcd Range API and key ranges](https://etcd.io/docs/v3.6/learning/api/)
- [Go client range options](https://github.com/etcd-io/etcd/blob/v3.6.0/client/v3/op.go)
- [etcd MVCC data model](https://etcd.io/docs/v3.6/learning/data_model/)
