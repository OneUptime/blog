# Validation Summary: How to Choose Linearizable or Serializable Reads in etcd

## Status

validated

## Post Type

Technical guide with executable shell examples and distributed consistency guidance.

## Technologies Covered

- etcd 3.7 and version-specific etcd 3.7.1 behavior
- etcdctl and the Go v3 client
- Linearizable and serializable reads, Raft, and quorum coordination
- MVCC revisions, transactions, watches, and compaction
- TLS client configuration and read latency measurement

## Sources Consulted

- [etcd 3.7 API guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/): operation completion, durability, linearizability, and watch guarantees.
- [Interacting with etcd](https://etcd.io/docs/v3.7/dev-guide/interacting_v3/): historical reads, watch progress, and compaction.
- [etcd API](https://etcd.io/docs/v3.7/learning/api/): member-local reads, revision fields, range limits, and atomic transaction comparisons.
- [Learner design](https://etcd.io/docs/v3.7/learning/design-learner/): learner restrictions and endpoint selection caveats.
- [etcdctl v3.7.1 documentation](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md): consistency flags, revision selection, JSON output, and environment variable naming.
- [etcdctl v3.7.1 global flags](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/ctlv3/ctl.go): endpoints, command timeout, output format, and TLS flags.
- [v3.7.1 RPC interceptor](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/interceptor.go) and [learner request filter](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/util.go): exact learner request restrictions.
- [v3.7.1 range implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/v3_server.go) and [read consistency implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/read/read.go): linearizable read notification, ReadIndex, and waiting for application of the confirmed index.
- [Go client v3.7.1 read options](https://github.com/etcd-io/etcd/blob/v3.7.1/client/v3/op.go): WithSerializable option.
- [etcd performance guide](https://etcd.io/docs/v3.7/op-guide/performance/): network, disk, request concurrency, connection counts, and consistency costs.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post is technically relevant and requires full validation because it contains shell commands and implementation details.
- Confirmed that linearizable reads respect completed writes but do not make a later write atomic. Transaction comparisons correctly address that separate requirement. Serializable reads may be stale and provide no general time-based freshness bound or cross-endpoint read-your-writes guarantee.
- Confirmed the default linearizable mode, explicit l/s values, JSON output, and all five ETCDCTL environment variables. The Bash block passes bash -n. Endpoint and certificate paths are deployment placeholders; no live cluster execution or latency benchmark was performed.
- Checked the cited documentation URLs and the v3.7.1 source reference. The referenced documentation and tagged source are available. No deprecated flags were identified in the examples.
- The learner design page includes historical implementation discussion. The v3.7.1 source independently confirms that ordinary Range requests are accepted on learners only when Serializable is true; writes are rejected. This is a version-specific statement, not a blanket claim about every learner API or health endpoint.
- The read implementation uses ReadIndex and waits for the confirmed index to be applied, supporting the explanation that a read need not create a new data mutation in the WAL.
- Watch progress is relative to the connected member and must be compared with an appropriate revision when assessing cache freshness. Historical pagination must retain one revision and handle compaction. The discussion correctly separates these concerns from current linearizable reads. A positive --rev selects a revision; zero or a negative revision uses the latest state.
- Benchmark guidance appropriately controls workload and connection effects and makes no unsupported numerical performance promise. Fencing guidance is conceptual and requires enforcement by the external resource being protected.
