# Why Does Geode Reject Inconsistent Gateway Sender IDs Across Region Hosts?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, WAN, Troubleshooting, Replication, Distributed Database

Description: Diagnose and correct Geode region hosts whose gateway-sender ID sets or sender definitions differ before WAN events are lost during routing or failover.

---

Apache Geode treats a distributed region's gateway sender IDs as cluster-consistency attributes, not a private choice made by each server. Every peer member that creates the same distributed region path must advertise the same **set** of sender IDs. If one new host creates `/orders` with `[to-site-b]` while an existing host has `[]`, region creation is rejected with a message like:

```text
Cannot create Region /orders with [to-site-b] gateway sender ids
because another cache has the same region defined with [] gateway sender ids
```

This check protects event routing. For a partitioned region, a key's primary bucket can move between hosts. For a replicated region, an operation can originate on any host. If only some hosts attach the WAN sender, whether an update leaves the site would depend on placement, origin, and failover. Geode refuses that nondeterministic configuration.

## Separate Two Consistency Rules

Gateway configuration has two related but distinct invariants.

### 1. A region path has one sender-ID set

Every member creating `/orders` must use the same region-level set:

```text
/orders -> {to-site-b}
```

Set order is irrelevant; membership is not. `{audit,to-site-b}` differs from `{to-site-b}`.

The region check happens even if a sender with that ID has not connected yet. It compares the IDs in region profiles within the local cluster, not remote receiver availability.

### 2. A sender ID has one sender definition

On all members hosting `to-site-b`, its configuration must be identical. That includes the remote distributed-system ID, serial or parallel mode, persistence, disk-store name, queue and batch settings, dispatcher threads, order policy, conflation, event filters, transport filters, and transaction grouping.

Matching region ID sets with different sender definitions is still invalid. Conversely, identically defined senders do nothing for `/orders` until the region attaches their ID.

## Why Parallel Senders Make Uniformity Essential

A parallel gateway sender runs on each member that hosts a partitioned region using it. Each member sends events for primary buckets it owns. The sender queue is colocated with those buckets, and all regions using the same parallel sender ID must be colocated.

If server 1 attached `to-site-b` and server 2 did not, an entry could replicate while its primary lives on server 1, stop replicating after rebalance to server 2, then resume after failback. The mismatch would be data-dependent and difficult to detect from the remote site.

For a serial sender, one active primary dispatches a logical queue and other configured instances provide high availability. Uniform region attachment is still required so operations anywhere in the distributed region enter that logical queue.

## Common Ways Configuration Drifts

Most mismatches come from deployment scope, not from Geode changing the setting:

- `create gateway-sender --groups=wan-a` targeted one server group, while `/orders` was created in a broader group;
- one member loaded stale `cache.xml` while others used cluster configuration;
- a rolling deployment changed region attributes on only the restarted members;
- embedded Java code conditionally called `addGatewaySenderId` based on an environment variable;
- `AttributesMutator.addGatewaySenderId` or `removeGatewaySenderId` ran on only one member;
- a new data accessor created the region from a template without its sender IDs;
- capitalization or punctuation changed in an ID; or
- two automation systems both owned the region definition.

Sender IDs are exact strings. `to-site-b`, `to-Site-b`, and `to-site-b ` are different IDs.

## Inspect the Region and the Sender Separately

Start with the cluster's shared view:

```text
gfsh> describe region --name=/orders
gfsh> list gateways
```

`describe region` shows hosting members and non-default region attributes. `list gateways` shows sender instances, their remote cluster IDs, type, status, queued events, and receiver locations. Capture both; one cannot substitute for the other.

On an embedded member, inspect the effective region attributes:

```java
Region<?, ?> orders = cache.getRegion("/orders");
Set<String> ids = orders.getAttributes().getGatewaySenderIds();
ids.stream().sorted().forEach(System.out::println);
```

Collect the result from every member that creates the path, including accessors, and compare sorted sets. Then inspect each `GatewaySender` with the matching ID and compare its effective configuration.

Also identify the source of each member's configuration:

- cluster configuration downloaded from locators;
- local `cache.xml`;
- embedded API code; or
- runtime mutation.

The fix will not persist if the next restart reloads the old source.

## Fix a New Member That Cannot Join

If the mismatch appears while a new server starts, leave the healthy members unchanged:

1. Stop the rejected server.
2. Determine the canonical sender-ID set from the running region and reviewed deployment configuration.
3. Correct that server's group membership, `cache.xml`, or API configuration.
4. If the sender is parallel, ensure its definition exists on the server before the region is created.
5. Restart it and re-run `describe region` and `list gateways`.

For a parallel sender created through Java APIs, creation order matters:

```java
GatewaySender sender = cache.createGatewaySenderFactory()
    .setParallel(true)
    .create("to-site-b", 2);

RegionFactory<String, PdxInstance> regions =
    cache.createRegionFactory(RegionShortcut.PARTITION_REDUNDANT);

Region<String, PdxInstance> orders = regions
    .addGatewaySenderId("to-site-b")
    .create("orders");
```

Creating the parallel sender after attaching its ID to the region can throw `IllegalStateException`. Declarative `cache.xml` handles its declared creation order, but mixed programmatic and declarative ownership is easy to get wrong.

## Repair a Running Runtime Mismatch Carefully

Geode's creation-time profile check rejects mismatched new region hosts. A mismatch introduced later through an attributes mutator can instead produce a warning from the sender-ID monitor:

```text
For the same region, across all members, gateway sender ids should be same.
```

Do not silence the warning by removing WAN replication from arbitrary members. First choose the intended region contract and assess the event gap. Attaching a sender now affects subsequent events; it does not automatically replay every preexisting region entry that was written while the sender was absent.

For a planned repair:

1. Quiesce or route writes away from the affected region if the business can tolerate it.
2. Measure the time and keys potentially written through mismatched hosts.
3. Correct the persistent source of configuration on every region member.
4. Apply one cluster-wide region change or perform a controlled restart, rather than per-member manual commands.
5. Verify that all sender queues are running and connected.
6. Backfill or reconcile the remote region for the suspected gap using an application-approved process.
7. Resume writes and compare source/target invariants.

The official `gfsh alter region --gateway-sender-id=...` mechanism can modify the region definition, but test its exact add/remove behavior for the deployed Geode version and apply the change at the region's full scope. In infrastructure as code, updating and restarting from one canonical configuration is often safer than combining runtime mutation with stale startup files.

## Apply Group Scope Consistently

Group-scoped configuration is useful only when the sender and region use compatible placement. For a parallel sender:

```text
gfsh> create gateway-sender \
  --id=to-site-b \
  --groups=wan-data \
  --remote-distributed-system-id=2 \
  --parallel=true

gfsh> create region \
  --name=orders \
  --type=PARTITION_REDUNDANT \
  --groups=wan-data \
  --gateway-sender-id=to-site-b
```

If another group also creates `/orders`, it needs the same region sender-ID set and the appropriate sender placement. Avoid overlapping groups that contribute conflicting definitions for the same path. Export and review cluster configuration as a complete artifact, not isolated commands.

## Check Persistence and Colocation Constraints

Uniform IDs are necessary but not sufficient:

- every partitioned region using the same parallel sender ID must be colocated;
- a replicated region must use a serial, not parallel, sender;
- a persisted parallel sender queue must use the same disk store as the persistent region;
- PDX metadata must be persisted for PDX values in WAN regions; and
- each remote receiver host must define the matching region path.

For a persistent partitioned region with a persistent parallel sender, assuming `WanDataStore` has already been created on every `wan-data` member:

```text
gfsh> create gateway-sender \
  --id=to-site-b \
  --groups=wan-data \
  --remote-distributed-system-id=2 \
  --parallel=true \
  --enable-persistence=true \
  --disk-store-name=WanDataStore

gfsh> create region \
  --name=orders \
  --type=PARTITION_PERSISTENT \
  --groups=wan-data \
  --disk-store=WanDataStore \
  --gateway-sender-id=to-site-b
```

Do not “fix” an ID mismatch only to leave the same ID pointing to different remote system IDs or disk stores on different members.

## Prevent Recurrence with a Configuration Contract Test

Before production rollout, start at least two members from the exact artifacts intended for each group and assert:

```text
for each distributed region path:
  gateway-sender-id set is equal on every region member

for each sender id:
  effective sender configuration is equal on every sender member

for each parallel sender:
  sender hosts cover all region data hosts
  attached partitioned regions satisfy colocation rules

for each receiving site:
  matching region paths exist on receiver hosts
```

Then rebalance buckets, fail a sender member, and put keys before and after primary movement. Confirm every event arrives remotely and sender queues return to zero. This tests the reason for the invariant, not only the startup check.

## Conclusion

Geode rejects unequal gateway sender IDs because WAN routing must not depend on which member currently owns or originates an operation. Keep one canonical ID set per region path, one identical definition per sender ID, and one deployment scope that covers every region host. When repairing drift, account for events written during the gap; configuration consistency prevents future loss but does not backfill history automatically.

## Official References

- [Configuring a multi-site WAN system](https://geode.apache.org/docs/guide/latest/topologies_and_comm/multi_site_configuration/setting_up_a_multisite_system.html)
- [Overview of multi-site caching](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/multisite_overview.html)
- [`create gateway-sender` command and identical-configuration requirement](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html)
- [Managing region attributes](https://geode.apache.org/docs/guide/latest/basic_config/data_regions/managing_region_attributes.html)
- [Geode 2.0.0 source: distributed region profile rejects unequal sender-ID sets](https://github.com/apache/geode/blob/ada321925c721b3514341c1ffba325ab162d1d0a/geode-core/src/main/java/org/apache/geode/internal/cache/CreateRegionProcessor.java#L552-L561)
- [Geode 2.0.0 source: runtime sender-ID mismatch monitor](https://github.com/apache/geode/blob/ada321925c721b3514341c1ffba325ab162d1d0a/geode-core/src/main/java/org/apache/geode/internal/cache/SenderIdMonitor.java#L112-L127)
