# How to Choose Linearizable or Serializable Reads in etcd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Consistency, High Availability, Kubernetes, Troubleshooting

Description: Choose etcd read consistency from application requirements, understand stale local reads, and measure latency without weakening coordination correctness.

An etcd client normally requests a linearizable read. That read participates in the cluster's consistency mechanism so that it respects completed writes. A serializable read can be served from a member's local applied state, reducing dependence on communication with the current quorum while permitting stale results.

The option is easy to change, but its consequence belongs in the application contract. A stale dashboard value and a stale ownership decision have very different effects. These examples use etcd 3.7 and `etcdctl`; the same v3 consistency distinction applies to the Go client.

## Define the Freshness Requirement Precisely

Suppose a successful write changes `/config/generation` from `17` to `18`. A linearizable read begun after that write completes must not return the earlier generation, unless a subsequent write changed the key again. It observes a valid point in the operation's invocation-to-response interval.

That does not mean its returned value remains current after the response. Another client can update the key immediately. A read followed by a write is still two operations; use an etcd transaction when the write must depend atomically on the observed version.

A serializable read may return `17` from a follower that has not applied the write yet. Its result is still durable local state, not an uncommitted speculative write. There is no general maximum staleness bound supplied by this option. The [API guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/) explain the distinction and the role of revisions.

## Make the Choice Visible in Commands

Set the connection configuration for your cluster. These examples assume a TLS client listener and authorized credentials:

```bash
export ETCDCTL_ENDPOINTS=https://etcd-1.example.net:2379
export ETCDCTL_CACERT=/etc/etcd/pki/ca.crt
export ETCDCTL_CERT=/etc/etcd/pki/app-client.crt
export ETCDCTL_KEY=/etc/etcd/pki/app-client.key
export ETCDCTL_COMMAND_TIMEOUT=5s

etcdctl get /config/generation --consistency=l --write-out=json
etcdctl get /config/generation --consistency=s --write-out=json
```

`l` means linearizable and is the default; `s` requests serializable. Preserve the response header revision and each key's modification revision while investigating freshness. The response revision describes the read's store context, while a key's modification revision describes its most recent change.

Comparing two commands against a healthy, caught-up member will usually show the same value. That is expected and does not prove the modes are equivalent during lag or a partition. Avoid constructing a production network failure merely to demonstrate their difference.

## Select by Use Case

| Operation | Useful starting point | Reason |
| --- | --- | --- |
| Verify a completed configuration publication | Linearizable | The reader must observe the completed publication or a later state |
| Check a displayed diagnostic counter | Serializable, if documented | A stale diagnostic value may be acceptable |
| Read ownership before changing shared state | Transaction with comparisons | A standalone read cannot make the following write atomic |
| Refresh a bounded-staleness application cache | Explicit freshness design | Serializable alone supplies no time bound |
| Read a historical snapshot at a chosen revision | Revision-pinned range | Historical consistency is a separate choice from current freshness |

Do not replace failed linearizable requests with serializable requests and return an indistinguishable success. If an interface permits degraded results, identify them explicitly and prevent downstream code from treating them as current authority.

For a coordination service, stale lock or election state can mislead a caller even though the database's write-side transaction checks still work correctly. Preserve those checks and use fencing where another system must reject a stale owner.

## Account for Endpoint Selection

A linearizable request does not require the client to know the leader's address. A voting follower can serve it using the cluster's read-consistency protocol. It need not append a fresh data mutation to the WAL merely because the operation is a read.

A serializable request uses the endpoint selected by the client. Load balancing across followers can therefore expose different applied positions on successive requests. It does not create a read-your-writes session guarantee. Pinning an endpoint can make diagnostics easier, but does not turn local reads into quorum-confirmed reads.

Learners require another distinction. In etcd 3.7.1, a learner can serve a serializable range request while rejecting ordinary linearizable range requests and writes. This makes a successful local read an insufficient application readiness test. Use the [learner design](https://etcd.io/docs/v3.7/learning/design-learner/) and version-specific health behavior when deciding which members belong in client endpoints.

## Measure the Benefit Under Real Conditions

Compare the modes using the same key range, response size, endpoint placement, connection reuse, and request rate. Otherwise a large serialization cost or cross-region client connection can dominate the result and obscure the consistency overhead.

Track request latency percentiles, timeouts, member applied positions, leader changes, and peer network latency. Use a bounded test workload and a representative key size. A single shell command includes process startup and connection setup, so it is useful for correctness checks but a poor benchmark of steady-state client performance.

If linearizable latency rises, investigate quorum communication, overloaded members, and slow storage before weakening the read contract. Increasing a deadline gives a slow request more time; changing consistency changes what success means.

## Keep Watches and Historical Reads Separate

Watches have ordered revision-based delivery guarantees, but they are not linearizable reads. A quiet watch is not proof that a cache contains every completed write. Use documented watch progress and revision handling when combining a cache with direct reads.

Likewise, `--rev` requests historical state rather than the latest state. Pinning every page of a large range to one revision gives a coherent dataset until that revision is compacted. It should not be described as a way to obtain fresher serializable results. On compaction, restart the snapshot workflow instead of mixing pages from different revisions.

## Conclusion

Use linearizable reads when completed writes must be reflected, and serializable reads where stale local state is acceptable. Make degraded freshness observable, keep atomic decisions inside transactions, and benchmark the actual workload before changing its consistency contract.

## Official Documentation

- [etcd API guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/)
- [Interacting with etcd and consistency modes](https://etcd.io/docs/v3.7/dev-guide/interacting_v3/)
- [etcd learner design](https://etcd.io/docs/v3.7/learning/design-learner/)
- [etcdctl range options](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
