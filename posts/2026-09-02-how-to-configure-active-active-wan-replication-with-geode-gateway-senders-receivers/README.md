# Configure Active-Active Geode WAN Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, WAN, Replication, High Availability, Data Persistence

Description: Connect two writable Geode clusters with bidirectional gateway senders, receivers, persistent queues, PDX metadata, and explicit conflict handling.

---

An active-active Apache Geode deployment lets applications write to either site while gateway senders asynchronously replicate selected region events to the other. Each direction is independent: Site A needs a sender targeting Site B and a receiver accepting Site B, while Site B needs the mirror image.

This is not a synchronous distributed transaction across data centers. Each site commits locally, queues an event, and later receives an acknowledgment from the remote gateway receiver. During a WAN outage the sites continue independently, queues grow, and conflicting updates are resolved when communication resumes.

The design must therefore define:

- unique distributed-system IDs and locator discovery;
- region and sender placement;
- queue persistence and disk capacity;
- conflict rules and clock synchronization;
- data-model portability;
- duplicate-safe consumers; and
- recovery behavior for a long link or site outage.

The example uses two partitioned, persistent `/orders` regions and parallel gateway senders.

## Give Each Site a Unique Distributed-System ID

WAN discovery requires locators. Configure every member in a site, including its locators and data servers, with the same local `distributed-system-id`, and give each site a different ID.

Site A `gemfire.properties`:

```properties
mcast-port=0
locators=locator-a.example.net[10334]
distributed-system-id=1
remote-locators=locator-b.example.net[10334]
```

Site B `gemfire.properties`:

```properties
mcast-port=0
locators=locator-b.example.net[10334]
distributed-system-id=2
remote-locators=locator-a.example.net[10334]
```

Use multiple local and remote locators in production so one locator failure does not remove discovery. Open the locator paths in both directions and use names that resolve from the remote site, not only inside a private local namespace.

Start each site's locators before its data servers. Keep the default `conserve-sockets=false` for WAN members; Geode's WAN guidance warns that conserving sockets can contribute to messaging hangs under the additional gateway load.

## Select Parallel or Serial Senders from the Region Type

A parallel gateway sender is deployed on every member hosting the attached partitioned region. Members owning primary buckets send those bucket events concurrently. This scales with the partitioned region; it does not preserve region-wide ordering, although ordering within a particular partition can be preserved.

A replicated region cannot use a parallel sender; use a serial sender. Multiple instances of the same serial sender provide high availability, but only one is primary at a time. A serial sender offers stronger centralized ordering control at lower horizontal throughput.

For this example, assign all data servers to a `wan-data` group and use a partitioned region with one redundant copy. Every member that hosts `/orders` must have the same gateway sender ID attached.

## Persist PDX Metadata Before Starting Data Members

PDX is the safest format for independently deployed sites. It lets the receiver and query engine handle named fields without requiring identical domain classes. Because the PDX data is both persistent and WAN-distributed, persist the PDX registry before servers start:

```text
gfsh> configure pdx --read-serialized=true --disk-store=DEFAULT
```

Run the command in each site's cluster configuration. The default PDX store is separate from the named `WanDataStore` used below. Use compatible PDX schemas in both sites: keep logical type names, each existing field's physical type, and identity-field choices consistent. PDX supports schema evolution by adding or removing fields.

If a server was already running when PDX was configured, restart it before admitting data. Back up PDX metadata with the region and queue stores.

## Create a Disk Store for Region and Parallel Queue Persistence

Create a member-local directory on every `wan-data` server. The path string can be the same across hosts, but two server processes must never share one directory.

In each site:

```text
gfsh> create disk-store --name=WanDataStore \
  --groups=wan-data \
  --dir=/data/geode/wan#1024000 \
  --auto-compact=true \
  --allow-force-compaction=true \
  --disk-usage-warning-percentage=75 \
  --disk-usage-critical-percentage=90
```

Persisted data from a **parallel** gateway sender must use the same disk store as its region because the queue is colocated with region buckets. Size the store for region data, redundancy, the maximum WAN outage queue, oplog garbage, and compaction headroom. `maximum-queue-memory` is not the total outage capacity; gateway queues overflow to disk after their in-memory budget.

## Create a Receiver in Both Sites

A receiver listens for incoming batches. Create one on multiple data servers for load balancing and high availability:

```text
gfsh> create gateway-receiver \
  --groups=wan-data \
  --start-port=15000 \
  --end-port=15010
```

Open the full receiver port range through the WAN firewall. Geode chooses an available port from the configured range for each receiver. If the receivers advertise addresses that remote senders cannot route, set `--hostname-for-senders` to a reachable hostname.

Every member hosting a receiver must define every region for which it may receive an event. Complete the region setup in both sites before allowing producers to write. If a receiver gets an event for a missing region, Geode throws an exception.

Only one gateway receiver can run in a member. Creating receivers on several members is the supported way to add receiver availability.

## Create One Sender in Each Direction

Connect `gfsh` to Site A and create its sender targeting Site B's distributed-system ID:

```text
gfsh> create gateway-sender \
  --id=to-site-b \
  --groups=wan-data \
  --remote-distributed-system-id=2 \
  --parallel=true \
  --enable-persistence=true \
  --disk-store-name=WanDataStore \
  --maximum-queue-memory=256 \
  --batch-size=500 \
  --batch-time-interval=1000
```

Connect to Site B and create the reverse sender:

```text
gfsh> create gateway-sender \
  --id=to-site-a \
  --groups=wan-data \
  --remote-distributed-system-id=1 \
  --parallel=true \
  --enable-persistence=true \
  --disk-store-name=WanDataStore \
  --maximum-queue-memory=256 \
  --batch-size=500 \
  --batch-time-interval=1000
```

Create the sender before attaching its ID to a region. For Java API configuration, Geode explicitly requires a parallel sender to exist before `RegionFactory.addGatewaySenderId`; otherwise region creation throws `IllegalStateException`.

The configuration for a given sender ID must be identical on every member that hosts that sender. Apply it through group-scoped cluster configuration rather than per-member startup fragments.

## Create Matching Regions and Attach the Local Sender

In Site A:

```text
gfsh> create region --name=orders \
  --type=PARTITION_PERSISTENT \
  --groups=wan-data \
  --redundant-copies=1 \
  --disk-store=WanDataStore \
  --gateway-sender-id=to-site-b
```

In Site B:

```text
gfsh> create region --name=orders \
  --type=PARTITION_PERSISTENT \
  --groups=wan-data \
  --redundant-copies=1 \
  --disk-store=WanDataStore \
  --gateway-sender-id=to-site-a
```

The receiving region name must exactly match the sending region name. Keep partitioning, key/value contracts, persistence, colocation, and constraints compatible. All partitioned regions that use the same parallel sender ID must be colocated; design the partition resolver and colocation tree before creating them.

Do not attach `to-site-b` in Site B or `to-site-a` in Site A. Sender IDs are local configuration names. Their `remote-distributed-system-id` establishes the destination.

## Understand Which Operations Cross the WAN

Geode distributes these entry operations through a gateway sender:

- create;
- put/update; and
- distributed destroy when it is not an expiration action.

It does not distribute gets, invalidates, local destroys, expiration actions, or region operations. If business correctness requires a remote delete when an item expires, produce an explicit distributed destroy or a domain tombstone rather than relying on local expiration.

Gateway delivery is asynchronous and can be processed more than once. The sender removes a batch only after a successful receiver acknowledgment; if connectivity fails after remote processing but before acknowledgment, the batch can be resent. Cache application is versioned, but any listeners, external writes, or downstream side effects should be idempotent.

## Define Active-Active Conflict Semantics

Two sites can update the same key while disconnected. By default, Geode compares WAN version timestamps. A later timestamp wins; if timestamps tie, the event associated with the higher distributed-system ID wins. Synchronize every member clock to a common, reliable time source. Clock skew changes business outcomes under the default resolver.

The default gives eventual convergence, not application-specific merging. It can discard one site's update when two users modify different fields of the same value. Choose one of these approaches explicitly:

- assign each key a single home site;
- make writes commutative or append-only;
- store field-level or domain version information and merge in the application; or
- deploy a custom `GatewayConflictResolver` on every relevant member.

A custom resolver receives potentially conflicting cross-site events and decides whether to apply the remote event. It must be deterministic across sites and versions and make the same decision for a pair of events regardless of arrival order. Test equal timestamps, clock skew, deletes, reconnect bursts, and rolling deployments. A resolver does not turn WAN replication into a distributed lock.

## Avoid Topology Loops and Duplicate Paths

For two sites, one sender per direction is a direct mesh and is easy to reason about. Geode tracks distributed-system IDs to avoid forwarding an event back to a site known to have seen it. Messages do not accumulate the IDs of every transit site, however, so any topology that can deliver the same update twice to a site does not work and is unsupported. Prefer a fully connected mesh when the site count and network policy permit it; otherwise use a supported ring or hybrid/tree topology from the official rules.

Never reuse a `distributed-system-id` across two independent sites. Conflict metadata and forwarding decisions depend on those IDs being unique.

## Secure WAN Traffic

Enable TLS for the `gateway` component on every sender and receiver process and configure mutually trusted key and trust stores:

```properties
ssl-enabled-components=gateway
ssl-require-authentication=true
ssl-endpoint-identification-enabled=true
ssl-keystore=/etc/geode/tls/site-a.p12
ssl-keystore-type=PKCS12
ssl-keystore-password=${PROTECTED_SECRET}
ssl-truststore=/etc/geode/tls/wan-trust.p12
ssl-truststore-type=PKCS12
ssl-truststore-password=${PROTECTED_SECRET}
```

Property files do not interpolate shell variables automatically; the placeholder illustrates secret injection by the process supervisor. Protect the real `gfsecurity.properties` file or use the JSSE default-context mechanism supported by the deployment. Certificate subject alternative names must match advertised receiver hosts when endpoint identification is enabled.

The `gateway` component covers sender-to-receiver replication sockets. If remote-locator discovery also crosses an untrusted network, enable the separate `locator` SSL component consistently on locators and on every process that contacts them.

Gateway senders and receivers use their server member's Geode security credentials for integrated authentication. TLS trust and Geode authorization solve different layers; configure both where required.

## Operate and Test the Pair

Inspect each site:

```text
gfsh> list gateways
gfsh> status gateway-sender --id=to-site-b
```

Use `to-site-a` in Site B. Monitor sender connection state, queued event count, queue disk bytes, batch rate, receiver failures, conflict counts, and oldest queued-event age. Queue depth alone can look stable while a continuously growing workload keeps old events stuck.

Run a controlled test:

1. Put a uniquely keyed PDX value in Site A and observe it in Site B.
2. Put a different key in Site B and observe it in Site A.
3. Update the same key in both sites with controlled timestamps and confirm the intended winner.
4. Block the WAN path, continue writes within the planned outage budget, and confirm persistent queues grow without filling disk.
5. Restart a sender member while disconnected and verify its persistent queue recovers.
6. Restore connectivity, observe queue drain, and compare hashes or business invariants in both regions.
7. Fail a gateway receiver and confirm senders discover another one.

Do not declare a site recovered merely because `Queued Events` reaches zero. Verify region state and application-level invariants after conflicts and replay.

## Conclusion

Active-active Geode is two asynchronous replication paths, not one synchronous database. Give sites unique IDs, configure receivers in both, attach one local sender consistently to every region host, persist parallel queues with their regions, persist PDX metadata, and size disk for the outage budget. Then make conflict resolution, duplicate safety, clock discipline, and post-recovery verification part of the application design.

## Official References

- [Configuring a multi-site WAN system](https://geode.apache.org/docs/guide/latest/topologies_and_comm/multi_site_configuration/setting_up_a_multisite_system.html)
- [Overview of multi-site caching](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/multisite_overview.html)
- [Multi-site event distribution](https://geode.apache.org/docs/guide/latest/developing/events/how_multisite_distribution_works.html)
- [Multi-site WAN topologies](https://geode.apache.org/docs/guide/latest/topologies_and_comm/multi_site_configuration/multisite_topologies.html)
- [How consistency is achieved in WAN deployments](https://geode.apache.org/docs/guide/latest/developing/distributed_regions/how_region_versioning_works_wan.html)
- [Resolving conflicting WAN events](https://geode.apache.org/docs/guide/latest/developing/events/resolving_multisite_conflicts.html)
- [Configuring multi-site event queues](https://geode.apache.org/docs/guide/latest/developing/events/configure_multisite_event_messaging.html)
- [`create gateway-sender` and `create gateway-receiver`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html)
