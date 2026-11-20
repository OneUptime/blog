# Aerospike SESSION vs. LINEARIZE: Choose Your Read Guarantee

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Java, Performance

Description: Choose Aerospike SESSION or LINEARIZE reads by understanding client scope, cross-service ordering, availability trade-offs, and explicit Java policies.

A customer changes a preference through one application instance. Their next request reaches another instance. Both use the same Aerospike namespace, but they do not necessarily share the same client session. The question is whether the read needs an ordering guarantee across those independent clients.

Aerospike's `SESSION` and `LINEARIZE` read modes answer different versions of that question. They apply to namespaces configured for strong consistency (SC). Selecting a read policy does not convert an available-mode namespace into an SC namespace. This guide uses **Java client 10.5.0** and a **Database Enterprise 8.2 SC namespace**, focusing on individual record reads.

## Define the guarantee in application terms

`SESSION` preserves an increasing sequence of record versions within a client session. Once that client observes a version, it should not later observe an earlier version of the same record. It also supports reading the client's own successful writes.

`LINEARIZE` extends ordering across clients. Linearizability means operations behave as though they occurred in a single order consistent with real-time completion: a read started after a completed write cannot return a version preceding that write. Concurrent operations still need an ordering, but their wall-clock overlap does not dictate which happens first. [Strong-consistency guarantees](https://aerospike.com/docs/database/learn/strong-consistency/)

| Question | SESSION | LINEARIZE |
|---|---|---|
| Is it the default Java SC read mode? | Yes | No, select explicitly |
| Where is the ordering guarantee scoped? | This client session | Across clients |
| Does the client read from the master? | Yes | Yes |
| Does it make several independent reads one snapshot? | No | No |

The pinned [ReadModeSC enum](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/ReadModeSC.java) defines the Java modes and routing behavior. “Increasing” includes seeing the same committed version again when nothing changed; it does not mean every read must show a new update.

## A browser session is not a database client session

In this context, the session belongs to the Aerospike client instance and its cluster state. It is not automatically the user's login cookie, an HTTP session, or a shared account identifier.

Imagine requests handled by three service replicas, each with its own long-lived client. A load balancer can send the next request to a client that did not make or observe the previous operation. Session consistency is still useful within each client, but the application should not silently treat those three sessions as one global observer.

Aerospike clients track partition regimes, which are version counters for partition ownership state. That tracking helps a session reject responses from an older regime it has already moved beyond. It is not a portable “latest version seen” token that your HTTP layer automatically carries between service instances. [Consistency architecture](https://aerospike.com/docs/database/learn/architecture/clustering/consistency-modes/)

If a service-to-service handoff requires a read to reflect another client's completed write, use a guarantee designed for that boundary. Do not rely on the fact that healthy-cluster tests usually return the newest value.

## Make the policy visible at the read site

Use the Maven dependency `com.aerospike:aerospike-client-jdk8:10.5.0`. The following helper assumes an existing authenticated client and your application's base read policy, including its chosen deadlines. It makes no connection or credential changes.

```java
import com.aerospike.client.AerospikeClient;
import com.aerospike.client.Key;
import com.aerospike.client.Record;
import com.aerospike.client.policy.Policy;
import com.aerospike.client.policy.ReadModeSC;

public final class ConsistentReads {
    public static Policy session(Policy base) {
        Policy copy = new Policy(base);
        copy.readModeSC = ReadModeSC.SESSION;
        return copy;
    }

    public static Policy linearized(Policy base) {
        Policy copy = new Policy(base);
        copy.readModeSC = ReadModeSC.LINEARIZE;
        return copy;
    }

    public static Record readAfterServiceHandoff(
            AerospikeClient client, Key key, Policy base) {
        return client.get(linearized(base), key);
    }
}
```

The two methods return independent policies so one request cannot temporarily change a shared policy used by another thread. The handoff method deliberately chooses the stronger cross-client contract. A missing record still returns the normal not-found representation; a failed read remains an error to handle, not permission to switch consistency modes automatically.

Policy construction and defaults are documented in the [tagged Policy source](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/Policy.java). The helper was compiled against the actual artifact, and local assertions checked mode selection, inherited deadlines, and isolation of the original policy. Those checks do not exercise distributed consistency.

## Understand the availability and latency cost

Linearized reads require additional synchronization. Aerospike describes checks with acting replicas to establish the current partition state. This is coordination work, not a client request to fetch every replica's record and compare them. The additional dependency can affect latency and success during network disruption. [Linearizable read behavior](https://aerospike.com/docs/database/learn/strong-consistency/)

There is no universal latency multiplier to put into a capacity spreadsheet. Measure the paths your application uses, including cross-zone latency, concurrency, and failure recovery. Record deadline failures as well as successful-read latency; a graph excluding timed-out reads can make a failing configuration look fast.

`SESSION` is not a promise of availability under every partition. Both modes still operate within SC rules and read from the master. Replica preference does not make these modes read from a nearby replica. The [policy reference](https://aerospike.com/docs/database/learn/policies/) explains that replica selection is ignored for these strict SC modes.

The separate `ALLOW_REPLICA` and `ALLOW_UNAVAILABLE` modes relax guarantees. They can serve committed but older data and do not guarantee monotonically increasing observations. Treat them as different product behavior, with explicit approval from the application owner, rather than an invisible retry fallback.

## Keep record reads separate from business atomicity

A linearized read of one inventory record followed by a linearized read of an order record is still two operations. Another writer can act between them. If the business invariant spans records, use an appropriate multi-record transaction design; setting `readModeSC` alone does not create one.

Likewise, a strong read does not make a later write conditional on what was read. A read-modify-write workflow needs conflict protection or an atomic operation suitable for its data model. Aerospike's [client policy matrix](https://aerospike.com/docs/develop/client-matrix/) distinguishes read consistency from other write policies.

Do not use Aerospike's generation field as an unbounded global history counter in a test. Generations wrap, as described in the [generation-policy reference](https://aerospike.com/docs/database/learn/policies/). For an ordering experiment, write an application-controlled sequence value into a disposable record, using a single writer so concurrent sequence assignment does not introduce a separate race.

## Test the contract across the actual client boundary

Build a staging history with two independent clients, A and B. Use one dedicated key, no expiry, no unrelated writers, and a known initial value. Client A writes an increasing sequence and records successful completion. Only after that completion, signal client B to perform a linearized read. B must not observe a value older than the acknowledged sequence.

Repeat with a long-lived single client to test session observations. Log invocation time, completion time, client identity, sequence value, selected policy, and error outcomes. A timed-out write is uncertain, so do not classify it as a confirmed commit or a definite absence. [SC timeout semantics](https://aerospike.com/docs/database/learn/architecture/clustering/consistency-modes/)

Run the history during a controlled staging handoff or network disturbance, then evaluate safety separately from availability. A read failure may preserve the guarantee while reducing availability. An older successful read can violate the intended contract even if the service reports HTTP success.

A finite test cannot prove linearizability for every failure. It can detect policy mistakes, accidental client boundaries, unsafe fallback behavior, and performance costs in representative scenarios. No live cluster test was performed for this article; the code checks were local, and the distributed test above remains a procedure to run in your environment.
