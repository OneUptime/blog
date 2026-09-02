# How to Prevent Split-Brain and Stale Writes During Failover and Failback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Split-Brain, Failover, Disaster Recovery, High Availability, Data Integrity

Description: Prevent dual-primary and stale-writer corruption with quorum, fencing, monotonic epochs, and deliberate reconciliation gates.

---

Split-brain occurs when disconnected parts of a system each believe they are authoritative. Stale writes occur when an old leader, client, worker, or delayed request mutates state after authority has moved.

The safety invariant is simple to state:

~~~text
For each protected key or partition, only the current writer epoch may
commit, and the accepted epoch never decreases. Once superseded, an
epoch may never commit again.
~~~

DNS, health checks, and an orchestration lock do not enforce this invariant on their own.

## Distinguish Coordination from Data Fencing

A leader-election service can tell cooperative processes which leader it currently recognizes. That is not enough if an old process pauses, loses contact, resumes, and can still write to an external database or device.

etcd's documentation makes this boundary explicit: its lease-backed lock can safely coordinate etcd-key updates only when lock ownership is validated in the same etcd transaction, but an external resource must itself provide version validation and consistent replicas. Use a **fencing token** that the protected write path checks.

~~~text
epoch 41: region A may write
failover allocates epoch 42 and conditionally advances storage from 41 to 42
storage rejects any activation that does not advance current_epoch
storage atomically commits a mutation only when request_epoch == current_epoch
late region A request with epoch 41 is rejected
~~~

The epoch must increase monotonically in a linearizable authority and never be reused, including after recovery. Before writes begin, the protected resource must atomically advance its durable active epoch only when the proposed epoch is newer, using a compare-and-swap against the expected prior epoch or an equivalent conditional update. It must reject delayed or reordered activation requests and preserve this monotonicity across restore. The protected resource must then validate that epoch atomically with every durable mutation. Checking it only in an API gateway does not protect direct database workers or already-open connections.

## Use Product-Supported Quorum Correctly

Consensus systems prevent multiple committed histories by requiring a majority under their documented topology. etcd, for example, stops accepting updates after losing quorum rather than continuing in split-brain; it tolerates up to (N-1)/2 permanent member failures for N members.

Do not generalize one product's guarantees to another. Verify:

- voting-member placement across failure domains;
- exact acknowledgement and read-consistency settings;
- behavior during partial network partition;
- witness or tie-breaker semantics;
- membership-change procedure;
- client behavior on stale or serializable reads;
- whether force-promotion abandons an old consensus group.

Two voting nodes split across two regions cannot each have a majority during isolation. Adding an arbitrary witness can introduce a different correlated failure if its location and network path are poorly chosen.

## Fence Before Promotion

Promotion should be a state machine:

~~~text
1. Detect and declare failure.
2. Acquire recovery workflow authority.
3. Fence old writers.
4. Verify fence from an independent path.
5. Select a valid recovery position.
6. Allocate a new writer epoch.
7. Promote recovery data service with application writes disabled.
8. Atomically advance the protected resource to the new epoch with a conditional update, and verify prior epochs are rejected.
9. Enable application writes carrying the new epoch.
10. Shift traffic.
~~~

In this sequence, steps 3 and 4 require a fence already enforced at every old durable commit path. The epoch advance in step 8 is an additional fence at the recovery resource; it cannot replace that pre-promotion prerequisite.

Fencing mechanisms include:

- power or hypervisor fencing;
- storage fabric or volume access revocation;
- database demotion through surviving quorum;
- revoking old-site write credentials and invalidating existing authenticated sessions;
- network isolation as a supplementary layer;
- writer epochs enforced by storage.

Red Hat's high-availability documentation uses quorum together with fencing to avoid split-brain and warns that improper resource release can lead to corruption and data loss.

“Host unreachable” is not successful fencing. Require evidence that the old actor cannot reach the protected resource or that any stale token it holds will be rejected.

## Make Clients and Workers Epoch-Aware

Authority can leak through:

- connection pools established before failover;
- queued jobs carrying no writer generation;
- scheduled jobs running in both sites;
- offline or mobile clients replaying requests;
- caches performing write-behind;
- retry libraries repeating an uncertain request;
- CDC consumers or replication pipelines pointed in the old direction.

Attach writer epoch and idempotency key to mutations where the application controls the protocol. After failover:

- close or expire old pools;
- stop old consumers and schedulers;
- reject stale epochs;
- deduplicate retries at the durable boundary;
- include epoch in audit and reconciliation records;
- monitor any request from a prior epoch as a high-severity signal.

Time-based leases can help coordination, but clock and pause assumptions matter. A monotonic token checked by the resource protects against a former lease holder that resumes late.

## Prevent Automatic Rollback from Creating a Second Split

Once the recovery site accepts writes, the old primary returning is not a rollback signal. It contains an older or divergent history.

On return:

1. keep it fenced and out of routing;
2. preserve its final logs and durable position as evidence;
3. compare histories and identify uncertain transactions;
4. rebuild or resynchronize it from the current primary using the vendor-supported method;
5. validate integrity and replication catch-up;
6. return it only as a replica;
7. plan failback as a new controlled role transition.

Never connect two independently writable histories and hope replication resolves them. If a supported multi-writer product has conflict resolution, validate business invariants after conflicts, not just technical convergence.

## Reconcile Uncertain Writes

Network failure can leave clients unsure whether a request committed. Build a reconciliation ledger:

~~~yaml
request_id: order-9821-attempt-1
client_observed: timeout
old_epoch: 41
new_epoch: 42
old_history: committed
new_history: absent
resolution: verify-side-effects-before-replay-or-import
owner: orders
~~~

For payments, inventory, identity, and other high-consequence operations, use domain-specific rules. Last-write-wins is not a universal reconciliation policy.

## Test Partitions, Not Just Crashes

A power-off test does not exercise split-brain. Inject:

- asymmetric partition where A sees B but B cannot see A;
- loss of consensus while workloads still reach storage;
- paused old leader that resumes after lease expiry;
- delayed in-flight write from the old epoch;
- duplicate, delayed, or reordered epoch-activation request;
- recovery controller restart;
- DNS caches sending traffic to both sites;
- source region returning after recovery writes;
- failed reverse replication during failback.

Assert that writes commit only under the currently active epoch, that the accepted epoch never decreases, and that attempts from superseded epochs are visibly rejected. Preserve a per-epoch write ledger and compare it with durable state.

## Acceptance Criteria

The design prevents split-brain when:

- write authority is scoped per key or partition and represented by a monotonic epoch;
- the final durable resource only advances its active epoch and rejects mutations from every other epoch;
- consensus topology and failure tolerance follow current vendor documentation;
- promotion cannot enable writes before independently verified fencing;
- connection pools, jobs, queues, and retries cannot bypass the epoch;
- returning old primaries remain fenced and rejoin only through rebuild or supported resynchronization;
- uncertain writes have idempotency and domain reconciliation procedures;
- partition and paused-leader exercises show at most one active committing epoch, including expected intervals with no valid writer;
- failback repeats the same fencing and authority-transfer discipline.

Availability may require refusing writes during uncertainty. That is often safer than accepting two incompatible truths.

## Official References

- [etcd v3.7: Disaster recovery and quorum loss](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [etcd v3.7: Locks, leases, and external-resource fencing](https://etcd.io/docs/v3.7/learning/why/)
- [Kubernetes: Leases and leader election](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Red Hat Enterprise Linux 8: Configuring and managing high-availability clusters](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/)
- [AWS Application Recovery Controller: Safety rules for routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.safety-rules.html)
