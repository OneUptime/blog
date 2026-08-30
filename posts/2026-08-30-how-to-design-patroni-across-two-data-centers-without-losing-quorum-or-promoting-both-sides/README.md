# How to Run Patroni Across Two Data Centers Without Split Brain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, etcd, High Availability, Quorum, Disaster Recovery, Network Partition

Description: Design a safe two-data-center Patroni architecture using independent DCS quorums, a standby cluster, explicit fencing, and manual site promotion.

---

Two data centers cannot provide automatic, partition-safe site failover by themselves. When the link fails, neither side can distinguish "the other site is down" from "the other site is alive but unreachable." Automatically promoting both sides favors availability and creates two writers; refusing to promote one side preserves safety but requires a quorum or an external witness.

Patroni's official multi-data-center guidance therefore recommends, for exactly two sites, two independent DCS clusters and a Patroni standby cluster in the second site. Site promotion is manual and requires positively fencing the original site first.

```text
DC1: Patroni primary cluster -> local three-member etcd cluster
                 |
                 | asynchronous PostgreSQL streaming/WAL archive
                 v
DC2: Patroni standby cluster -> separate local three-member etcd cluster
```

Each site can tolerate a local DCS member failure. A WAN partition does not split one etcd quorum or automatically authorize the standby site to write.

## Avoid the tempting two-site DCS layouts

A three-member etcd cluster split 2+1 between sites gives the two-member site automatic authority and makes the one-member site unavailable for elections. It is not symmetric site HA. A four-member 2+2 cluster still needs three votes, so neither half has quorum after the link fails. Adding members without a third independent failure domain does not solve the information problem.

Patroni documents that an automatically zone-tolerant design needs at least three failure domains, with an odd three- or five-member DCS distributed among them. A genuinely independent third location hosting a voting DCS member can supply the vote needed for a majority, but it must have reliable failure characteristics and latency; placing that member inside either existing power or network failure domain only biases quorum toward that site and does not create a third failure domain.

Do not stretch one DCS across two sites and enable DCS failsafe mode as a substitute for topology. Failsafe lets an existing primary continue during certain DCS failures only if it can reach every known Patroni member. It does not create a new cross-site consensus system.

## Bootstrap the standby cluster

Give DC2 a different Patroni `scope` and its own DCS. Patroni says primary and standby clusters must not share the same DCS scope, even if they happen to use the same DCS service.

At initial bootstrap, DC2's Patroni configuration can include:

```yaml
bootstrap:
  dcs:
    standby_cluster:
      host: postgres-write.dc1.example.net
      port: 5432
      primary_slot_name: dc2_standby
      create_replica_methods:
        - basebackup
```

The standby leader streams from the remote source. Other DC2 members can cascade from that standby leader. Patroni's standby-cluster settings in `bootstrap.dcs` are applied once; subsequent changes must be made in dynamic DCS configuration.

If `primary_slot_name` is used, create and retain the corresponding physical replication slot in the primary cluster; the standby cluster does not create it remotely. Monitor retained WAL and disk space because an offline remote consumer can make a slot retain WAL indefinitely. A WAL archive provides additional recovery resilience but does not remove the need to monitor the slot and replication delay.

Use unique Patroni member names across the primary and every standby cluster. Current Patroni documentation warns that duplicate member names also duplicate PostgreSQL `application_name` values, which can cause synchronous replication to acknowledge the wrong standby silently.

## Define the RPO honestly

Cross-site asynchronous replication preserves DC1 write latency and availability, but acknowledged transactions not yet received by DC2 can be lost during disaster promotion. Measure receive and replay positions, archive freshness, and byte/time lag continuously.

Synchronous replication across the WAN can reduce acknowledged-write exposure but adds WAN latency and can block writes during link loss. Patroni synchronous mode has its own availability trade-offs and does not make a two-site DCS partition magically decidable. If zero transaction loss and automatic site failover are both requirements, add a properly independent third failure domain and design the PostgreSQL and DCS quorum together.

## Make promotion a fenced disaster-recovery action

DC2 cannot safely auto-promote because it cannot know whether DC1 is still accepting writes. The runbook must require positive fencing (STONITH) of DC1 before enabling writes in DC2. Acceptable fencing is external to the failed database path: power control, provider API shutdown, storage/network isolation, or withdrawal of every client route and replication credential. "We cannot ping it" is not fencing.

After fencing and checking the last received/replayed WAL, promote through Patroni. Patroni 4.1 and later provide `patronictl promote-cluster`, which removes the `standby_cluster` section from dynamic configuration and waits for the standby leader to become a primary:

```bash
patronictl -c /etc/patroni/dc2.yml promote-cluster dc2-ha
```

On older supported Patroni releases, remove `standby_cluster` with a reviewed `patronictl edit-config` change and verify the result. Patroni explicitly warns not to run `pg_ctl promote` for this workflow. Using Patroni keeps the local leader lock, member roles, and replicas coordinated.

A controlled command sequence is intentionally organization-specific, but the gates are universal:

1. Declare disaster and freeze automatic deployment or routing changes.
2. Prove DC1 cannot accept application or replication writes.
3. Record DC2's latest replay position and the accepted RPO exposure.
4. Run `patronictl promote-cluster` in DC2 (or the documented dynamic-configuration procedure on Patroni versions before 4.1).
5. Wait for one DC2 primary and verify SQL writability.
6. Move the global write route only after the database state is proven.
7. Reconcile ambiguous application transactions.

Limit the ability to remove standby mode and update global routing to a small, audited responder group. Require two-person approval if the action can knowingly create divergent timelines.

## Recover the original site without a second writer

When DC1 returns, keep its client route fenced. Its old primary cannot simply rejoin the new DC2 timeline as a writer.

Patroni's documented options are to convert the old primary site into a standby cluster of DC2 and attempt `pg_rewind`, or rebuild it from scratch. Patroni 4.1 and later provide `patronictl demote-cluster` to add the new remote-source settings and wait for a standby leader; older versions require the equivalent reviewed dynamic-configuration change. `pg_rewind` requires the target cluster to have either data checksums enabled or `wal_log_hints=on`, and `full_page_writes` must be `on`. It examines both clusters' timeline histories and needs the target's WAL back to the divergence point, either in `pg_wal` or retrievable from an archive with `pg_rewind -c`; it can still fail for other reasons. Preserve and reconcile any transactions that existed only on the old timeline before rewinding or rebuilding.

Only after the recovered site is a verified streaming standby should it receive read traffic or regain disaster-recovery eligibility. A future failback is another planned, fenced role reversal-not a DNS change.

## Test the design

In an isolated exercise, cut only the inter-site link while both local DCS clusters stay healthy. DC1 should remain the only writer; DC2 should remain a standby cluster and must not automatically promote. Then simulate complete DC1 fencing, execute the manual promotion gates, and reconcile the canary workload.

Also test a single etcd member loss in each site, loss of a local DCS majority, exhausted replication-slot disk, missing WAL, global-router failure, and restoration of DC1. Measure RTO from disaster declaration-not merely from the promotion command-and RPO from acknowledged workload reconciliation.

## Official Documentation

- [Patroni HA multi-data-center guidance](https://patroni.readthedocs.io/en/latest/ha_multi_dc.html)
- [Patroni standby clusters](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni `promote-cluster` and `demote-cluster` commands](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [etcd quorum and failure tolerance FAQ](https://etcd.io/docs/v3.7/faq/)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)

## Conclusion

For exactly two data centers, favor two local DCS quorums plus a Patroni standby cluster, and make site promotion manual after positive fencing. Automatic symmetric failover needs a truly independent third failure domain. Never use a WAN partition as proof of site death, never promote with `pg_ctl`, and treat restoration as a timeline reconciliation and rebuild operation before changing any client route.
