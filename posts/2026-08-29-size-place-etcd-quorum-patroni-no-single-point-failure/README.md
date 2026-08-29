# Sizing and Placing an etcd Quorum for a Patroni Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Patroni, PostgreSQL, High Availability, Quorum, Database Cluster, Failover

Description: Size and distribute etcd members so Patroni retains a safe consensus service through realistic host, zone, disk, and network failures.

---

Patroni can safely automate PostgreSQL leader election only while its distributed configuration store gives it a consistent answer. An etcd URL may look like a small configuration detail, but etcd's quorum, latency, and failure-domain placement directly shape database availability.

The central rule is: size etcd for the failures that must be tolerated, then place its voting members so one of those failures cannot remove a majority.

## Start with the quorum arithmetic

etcd uses Raft and requires a strict majority of configured voting members. For `N` members, the quorum is `floor(N/2) + 1`.

| Members | Quorum | Member failures tolerated | Operational use |
| ---: | ---: | ---: | --- |
| 1 | 1 | 0 | Development only; the host is a single point of failure |
| 2 | 2 | 0 | Avoid; it costs another host without improving tolerance |
| 3 | 2 | 1 | Normal minimum for production |
| 4 | 3 | 1 | No more tolerance than three, with more failure surface |
| 5 | 3 | 2 | Use when two simultaneous voting-member losses must be tolerated |
| 7 | 4 | 3 | Rare; more write latency and operational cost |

An odd count is efficient because adding one member to an odd-sized cluster increases the quorum without increasing tolerated failures. A three-member cluster should be the default, not a two-member “pair.” Choose five only when the stated failure model justifies the extra latency, machines, and maintenance complexity.

etcd membership is independent of the PostgreSQL node count. Three PostgreSQL nodes do not automatically imply three correctly placed etcd members, and PostgreSQL replicas are not votes in the etcd quorum.

## Write the failure-domain requirement first

For each member, record these correlated risks:

- Physical host and hypervisor
- Rack, power distribution unit, and top-of-rack switch
- Availability zone or data center
- Storage device and storage control plane
- Network route, firewall policy, and DNS dependency
- Maintenance owner and deployment pipeline

Then test the placement against the requirement.

### Three availability zones

For a regional cluster with low, stable inter-zone latency, place one of three etcd members in each of zones A, B, and C. Losing one zone leaves two votes and quorum. Do not place two members on the same virtualization host just because their instance names show different zones.

### Two availability zones

A three-member placement must be `2 + 1`. It survives loss of the zone holding one member but not loss of the zone holding two. There is no symmetric three-vote solution across two zones.

Options are to accept and document that asymmetry, add a third independent failure domain for the deciding member, or redesign the availability objective. A fourth member split `2 + 2` still needs three votes and therefore survives neither complete zone loss.

### Multiple regions

Do not stretch etcd globally merely to make a diagram look redundant. Every committed write depends on quorum communication and durable WAL, so high or variable round-trip time slows Patroni's DCS operations and can create spurious elections. Prefer a low-latency regional etcd cluster plus a separately designed cross-region PostgreSQL/standby-cluster strategy unless the measured latency and recovery objective justify a stretched DCS.

## Avoid correlated resource failure

etcd's write path is sensitive to disk latency. A member persists Raft log entries before acknowledging them; disk contention can delay heartbeats and cause leader changes even when the host remains online.

Co-locating etcd with PostgreSQL is compact, but a database checkpoint, backup, or query spike can starve the DCS that protects that same database. If co-location is unavoidable:

- Give etcd a separate low-latency SSD or at least a dedicated storage queue.
- Reserve CPU and memory so PostgreSQL cannot reclaim them.
- Set process and I/O priorities deliberately and monitor throttling.
- Keep etcd's data directory outside PostgreSQL's backup/cleanup jobs.
- Treat loss of the shared host as loss of both one PostgreSQL member and one DCS member in every failure exercise.

A better production layout is three small dedicated etcd instances across independent zones. Patroni stores metadata, not database rows, so capacity needs are modest; consistency of CPU, network, and fsync latency matters more than a large disk.

## Give Patroni every endpoint

Do not point all Patroni nodes at a single etcd address backed by one proxy. Patroni supports a list of endpoints and can discover the etcd topology:

```yaml
etcd3:
  hosts:
    - 10.50.1.11:2379
    - 10.50.2.11:2379
    - 10.50.3.11:2379
  protocol: https
  cacert: /etc/patroni/tls/etcd-ca.pem
  cert: /etc/patroni/tls/patroni-client.pem
  key: /etc/patroni/tls/patroni-client-key.pem
```

Use the `etcd3` section for the v3 API. etcd v2 and v3 keys are not mutually visible, so changing an established Patroni cluster from `etcd` to `etcd3` is not an in-place protocol toggle.

If a load balancer or etcd gateway is required, its instances, network paths, and failure-domain placement must be redundant. A single stable URL or virtual IP is acceptable only when the service behind it is genuinely highly available. A network policy that permits only one Patroni-to-etcd path recreates the same single point of failure.

## Bootstrap members with one identical cluster map

For a new static three-member cluster, each etcd member needs a unique name and address but the same `initial-cluster`, token, and initial state. For example, member `etcd-a` can use:

```yaml
name: etcd-a
data-dir: /var/lib/etcd
listen-peer-urls: https://10.50.1.11:2380
initial-advertise-peer-urls: https://10.50.1.11:2380
listen-client-urls: https://10.50.1.11:2379,https://127.0.0.1:2379
advertise-client-urls: https://10.50.1.11:2379
initial-cluster: etcd-a=https://10.50.1.11:2380,etcd-b=https://10.50.2.11:2380,etcd-c=https://10.50.3.11:2380
initial-cluster-token: patroni-prod-eu1
initial-cluster-state: new
client-transport-security:
  cert-file: /etc/etcd/tls/server.pem
  key-file: /etc/etcd/tls/server-key.pem
  trusted-ca-file: /etc/etcd/tls/ca.pem
  client-cert-auth: true
peer-transport-security:
  cert-file: /etc/etcd/tls/peer.pem
  key-file: /etc/etcd/tls/peer-key.pem
  trusted-ca-file: /etc/etcd/tls/ca.pem
  client-cert-auth: true
```

Use unique certificates with appropriate address identities and protect private keys. On `etcd-b` and `etcd-c`, change the member name and local listen/advertise addresses, not the shared cluster map.

`initial-cluster-state: new` is for the initial bootstrap only. Runtime membership changes use `etcdctl member add` and `member remove`; editing the initial map is not a safe replacement procedure.

## Tune from measured latency

etcd defaults to a `100ms` heartbeat interval and `1000ms` election timeout. These normally work on a low-latency LAN. For slower networks, official etcd guidance is to keep the heartbeat interval around the maximum average member round-trip time-roughly `0.5x` to `1.5x`-and set the election timeout to at least ten times the round-trip time. Use the same values on every member.

For example, if sustained cross-zone testing shows a maximum average RTT near `70ms` but occasional storage/network variation is higher, a starting point might remain:

```yaml
heartbeat-interval: 100
election-timeout: 1000
```

Do not lower these merely to make failover appear faster. Measure network tails and disk fsync latency during database backups, zone impairment, and host maintenance. Patroni's own `ttl`, `loop_wait`, and `retry_timeout` are separate values and must satisfy:

```text
loop_wait + 2 * retry_timeout <= ttl
```

Faster etcd elections do not override Patroni's leader-lock safety window.

## Verify health and performance

Run checks against the same endpoints and through the same network path Patroni uses, using administrator credentials that trust the same etcd CA. The separate admin certificate below does not validate Patroni's own client identity or RBAC permissions:

```bash
ETCD_ENDPOINTS=https://10.50.1.11:2379,https://10.50.2.11:2379,https://10.50.3.11:2379

etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  endpoint health --cluster

etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  endpoint status --cluster --write-out=table

etcdctl --endpoints=https://10.50.1.11:2379 \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  member list --write-out=table
```

Together, the status and membership tables should account for every configured member; the status output should show a single leader and only small differences in applied indexes. Monitor the official metrics endpoint, especially:

- `etcd_disk_wal_fsync_duration_seconds`
- `etcd_disk_backend_commit_duration_seconds`
- `etcd_server_proposals_pending`
- `etcd_server_proposals_failed_total`
- `etcd_network_peer_sent_failures_total`
- `etcd_server_leader_changes_seen_total`
- `etcd_server_has_leader`

Rising pending proposals, slow WAL fsyncs, or frequent leader changes are capacity and stability warnings even if `endpoint health` happens to pass.

## Exercise the stated failure model

In an isolated staging environment, remove one failure domain at a time and verify:

1. The surviving etcd majority remains writable.
2. Patroni continues renewing its leader lock without demoting the primary.
3. Patroni on every database node can reach more than one etcd endpoint.
4. Restoring the member does not create a new cluster ID or duplicate member.
5. A second member loss causes DCS writes to stop safely; it must not create two PostgreSQL primaries.

Do not perform a destructive quorum test first in production. A network partition test must account for both directions and the paths between Patroni REST APIs, PostgreSQL nodes, and etcd members-not only ICMP reachability.

## Replace a failed member safely

With a three-member cluster and one permanent failure, two live members still form quorum. Preserve that quorum while replacing the member:

1. Take and verify an etcd snapshot according to the disaster-recovery runbook.
2. Identify the dead member by ID with `etcdctl member list`.
3. Remove the dead member while the two survivors still have quorum.
4. Add the replacement with its final peer URL as a non-voting learner: `etcdctl member add etcd-d --peer-urls=https://10.50.3.12:2380 --learner`.
5. Start the replacement with the exact `ETCD_NAME`, `ETCD_INITIAL_CLUSTER`, and `ETCD_INITIAL_CLUSTER_STATE=existing` values printed by `member add` (or their YAML-key equivalents), plus local listen/advertise and TLS settings matching the final peer URL.
6. Wait for its Raft log to catch up and verify endpoint status.
7. Promote the caught-up learner with `etcdctl member promote <member-id>`, then verify that all three voting members are healthy before other maintenance.

Adding as a learner keeps it out of quorum until etcd confirms it is caught up; promote requests fail safely while it is too far behind. Add only one replacement at a time. Do not add a fourth **voting** member before removing an unreachable voter. With `strict-reconfig-check` enabled by default, etcd rejects a change that would leave fewer started voters than the new quorum. If that check has been disabled, four voters require three votes, so a replacement that fails to start can strand the two survivors. Do not use `--force-new-cluster` as routine repair: it overwrites membership to form a one-member cluster while retaining application data and is strongly discouraged because it panics if other members from the previous cluster are still alive; use the documented snapshot-restore procedure for disaster recovery.

## Failure modes and recovery

| Failure mode | Result | Recovery focus |
| --- | --- | --- |
| One of three members fails | Quorum remains, no additional failure tolerated | Replace promptly using runtime membership changes |
| Two of three members fail | No quorum; writes and linearizable reads stop | Recover a member with its intact data, or follow tested snapshot disaster recovery |
| One zone contains two of three members | Loss of that zone removes quorum | Change placement or formally accept the asymmetric objective |
| Slow shared disk causes missed heartbeats | Leader churn and DCS request timeouts | Isolate/fix storage; do not mask it only with larger timeouts |
| Patroni uses one non-redundant proxy or network path | The proxy or path becomes the DCS SPOF | Configure all direct endpoints or a genuinely redundant gateway |
| Member restored from an unrelated snapshot | Cluster ID/index conflicts or stale state | Stop it and use documented member replacement; never merge clusters |

If etcd loses quorum, Patroni may demote the PostgreSQL primary because it cannot renew the leader lock. That is a safety response, not proof that PostgreSQL itself is corrupt. Restore DCS quorum first, then let Patroni re-establish one leader. Do not bypass the DCS by manually promoting a replica unless the old primary is positively fenced and a separate disaster-recovery decision has accepted the consequences.

## References

- [etcd FAQ: cluster size, quorum, and failure tolerance](https://etcd.io/docs/v3.7/faq/)
- [etcd tuning guidance](https://etcd.io/docs/v3.7/tuning/)
- [etcd clustering guide](https://etcd.io/docs/v3.7/op-guide/clustering/)
- [etcd runtime reconfiguration and learners](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd configuration options](https://etcd.io/docs/v3.7/op-guide/configuration/)
- [etcd metrics](https://etcd.io/docs/v3.7/metrics/)
- [etcd disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
