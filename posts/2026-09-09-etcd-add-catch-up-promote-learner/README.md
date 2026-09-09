# How to Add, Catch Up, and Safely Promote an etcd Learner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Replication, High Availability, Monitoring, Linux

Description: Add an etcd member as a nonvoting learner, inspect replication progress, and promote it only after the server accepts its readiness.

---

Adding a new voting member immediately changes an etcd cluster's quorum calculation, even if that member has not started. A learner first receives replicated state without adding a vote. This gives you a way to validate the new machine and its connectivity before changing the voting set.

This procedure uses the v3 membership commands available in etcd 3.6 and 3.7. The example begins with three healthy voters named `etcd1`, `etcd2`, and `etcd3`, then adds `etcd4`. Learners still consume leader, disk, and network resources, so schedule the operation when the existing cluster has capacity.

## Verify the existing cluster and the new host

Use explicit existing voter client endpoints and administrative TLS credentials. If authentication is enabled, use a principal authorized to change membership.

```bash
export ETCDCTL_ENDPOINTS='https://etcd1.example.com:2379,https://etcd2.example.com:2379,https://etcd3.example.com:2379'
export ETCDCTL_CACERT=/etc/etcd/pki/ca.crt
export ETCDCTL_CERT=/etc/etcd/pki/operator.crt
export ETCDCTL_KEY=/etc/etcd/pki/operator.key
etcdctl endpoint health
etcdctl endpoint status --write-out=table
etcdctl member list --write-out=table
```

Record member IDs and current voting roles. Confirm a recent usable backup and that no other membership change is underway. On the new host, prepare the approved etcd version, storage, DNS, peer connectivity, and certificates. The new member's data directory must be empty and dedicated to this join; reusing a removed member's old data does not create a new identity.

Verify that every existing member can reach the new advertised peer endpoint and that the new host can reach the existing peers. Validate mutual TLS in both directions before registering the learner. A learner that cannot connect will not catch up simply because the add command succeeded.

## Register the learner once

Run this against the existing cluster:

```bash
etcdctl member add etcd4 \
  --peer-urls=https://etcd4.example.com:2380 \
  --learner
```

Save the returned member ID and the `ETCD_INITIAL_CLUSTER` and `ETCD_INITIAL_CLUSTER_STATE` values. The add operation changes the cluster's recorded membership; it does not launch a process on the new host. Do not keep issuing add commands while diagnosing a startup problem.

The official [runtime reconfiguration guide](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/) separates adding membership, starting the process, and promoting it. Learner limits depend on release and configuration, including `--max-learners` on releases that expose it. Do not assume an old documentation example describing one learner is a universal hard limit. Adding one at a time remains a useful operational discipline.

## Start the registered identity with existing cluster state

The following is an example YAML configuration for `etcd4`. Replace the initial-cluster value with the exact mapping returned by the add operation and use the host's real mounted certificate paths.

```yaml
name: etcd4
data-dir: /var/lib/etcd
listen-client-urls: https://10.0.0.14:2379
advertise-client-urls: https://etcd4.example.com:2379
listen-peer-urls: https://10.0.0.14:2380
initial-advertise-peer-urls: https://etcd4.example.com:2380
initial-cluster: etcd1=https://etcd1.example.com:2380,etcd2=https://etcd2.example.com:2380,etcd3=https://etcd3.example.com:2380,etcd4=https://etcd4.example.com:2380
initial-cluster-state: existing
client-transport-security:
  cert-file: /etc/etcd/pki/server.crt
  key-file: /etc/etcd/pki/server.key
  trusted-ca-file: /etc/etcd/pki/ca.crt
  client-cert-auth: true
peer-transport-security:
  cert-file: /etc/etcd/pki/peer.crt
  key-file: /etc/etcd/pki/peer.key
  trusted-ca-file: /etc/etcd/pki/peer-ca.crt
  client-cert-auth: true
```

Start etcd through the normal service manager with that configuration file. Do not mix it with environment values and assume both sources apply. Keep heartbeat/election settings and relevant cluster configuration aligned with the existing members.

If startup fails with unmatched peer URLs, compare the registered URL, `initial-advertise-peer-urls`, and the initial-cluster entry character for character. Inspect TLS, filesystem permissions, and cluster-ID errors before altering membership.

## Observe progress without routing clients to the learner

Query the new endpoint directly for status:

```bash
etcdctl --endpoints=https://etcd4.example.com:2379 \
  endpoint status --write-out=table
etcdctl member list --write-out=table
```

The new member should report `IS LEARNER` as true. Compare its Raft index and applied index with the leader across multiple samples, and inspect disk latency and snapshot-transfer logs. Temporary differences are expected while writes continue. A one-time matching index is useful evidence but is not the promotion authority.

Do not put the learner into the ordinary client load-balancer pool. It does not support the full workload of a voter, even though status and some local read operations are available. A replication health check and an application readiness check have different purposes.

## Let the server enforce promotion readiness

Once the learner is running and its lag has stabilized, request promotion through a healthy voter:

```bash
etcdctl member promote LEARNER_MEMBER_ID
```

Use the hexadecimal ID returned by `member add`, not a name or a rounded numeric JSON value. If the server says the learner is not in sync, wait and inspect progress before retrying with a bounded backoff. Do not bypass strict reconfiguration checks or invent an applied-index threshold to override the server.

Promotion changes the voting set. Three voters plus one promoted member means four voters and a majority of three, with the same one-voter failure tolerance as three voters. For a replacement, remove the specifically retiring member only after the new voter is healthy and according to the approved sequence. For expansion, plan the final odd-sized voting set explicitly; a learner is not a permanent extra vote.

## Verify or remove a failed attempt

After promotion, confirm `IS LEARNER` is false, endpoint health succeeds, and ordinary authenticated reads and writes work through the intended client path. Update discovery or load-balancer configuration only after those checks.

If the learner cannot be repaired, remove that learner's membership through a healthy voter, stop its process, and preserve diagnostic data. A later retry starts with a fresh member identity and empty data directory. Never remove a healthy voter merely to make a stalled learner appear ready.

## Conclusion

Register the new member as a learner, start the exact registered identity, and observe its replication before promotion. Let the server decide whether promotion is safe, then verify the resulting quorum and client readiness before continuing maintenance.

## Official Documentation

- [etcd learner membership workflow](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd learner design](https://etcd.io/docs/v3.6/learning/design-learner/)
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [etcd learner limit configuration source](https://github.com/etcd-io/etcd/blob/v3.6.0/server/embed/config.go)
