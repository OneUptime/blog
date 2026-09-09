# How to Drain and Replace an etcd Leader with move-leader

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Maintenance, High Availability, Kubernetes, Troubleshooting

Description: Transfer etcd leadership to a healthy voter, drain client traffic, and distinguish a temporary restart from permanent member replacement.

Planned maintenance is easier when the member you stop is already a follower. `etcdctl move-leader` requests a leadership transfer to a chosen voting member, reducing reliance on a failure-triggered election when the old leader stops.

It is only a leadership operation. It does not remove the old member, drain application connections, move its files, or guarantee uninterrupted requests. This guide uses etcd 3.7 and separates temporary maintenance from permanent replacement.

## Confirm the Maintenance Budget

Before taking any voter offline, verify the cluster has enough remaining healthy voters for quorum. Three voters require two; five require three. A learner does not add voting capacity. Resolve an already unavailable voter before consuming another failure slot.

Configure `etcdctl` with your cluster's normal TLS credentials, then inspect explicit endpoints:

```bash
export ETCDCTL_ENDPOINTS=https://etcd-1.example.net:2379,https://etcd-2.example.net:2379,https://etcd-3.example.net:2379
export ETCDCTL_CACERT=/etc/etcd/pki/ca.crt
export ETCDCTL_CERT=/etc/etcd/pki/operator-client.crt
export ETCDCTL_KEY=/etc/etcd/pki/operator-client.key
export ETCDCTL_COMMAND_TIMEOUT=10s

etcdctl endpoint status --write-out=table
etcdctl endpoint health
etcdctl member list --write-out=table
etcdctl alarm list
```

Look for a stable leader, no unresolved alarms, and followers whose applied progress is close to the leader under the normal workload. A single sample of the Raft index is not a synchronization certificate. Observe progress across several samples and inspect slow disk or peer-network symptoms before choosing the transferee.

Take a recent, verified snapshot as part of the maintenance plan. A leadership transfer cannot compensate for an unusable recovery path.

## Choose the Transferee by Its Member ID

Use the member list and status table together. Select a healthy non-learner voter that will remain available throughout maintenance. Record its hexadecimal member ID and the current leader's client endpoint.

Do not parse a decimal JSON member ID through a tool that rounds large integers, then convert the rounded value to hexadecimal. IDs are 64-bit values. The human-readable table already displays the hexadecimal identifier used by `move-leader`; a JSON parser with exact integer support is another option.

If the preferred destination is a learner, it must first catch up and be promoted through the normal membership workflow. Leadership cannot be transferred to an unpromoted learner.

## Request and Verify the Transfer

Replace both placeholders after checking the current status:

```bash
CURRENT_LEADER=https://etcd-1.example.net:2379
TARGET_MEMBER_ID=replace-with-verified-hex-member-id

etcdctl --endpoints="$CURRENT_LEADER" move-leader "$TARGET_MEMBER_ID"
etcdctl endpoint status --write-out=table
etcdctl endpoint health
```

The endpoint list supplied to the transfer command must include the current leader. Targeting only a follower can produce `no leader endpoint given`. This is distinct from selecting a follower as the destination member, which is the intended operation. The [etcdctl reference](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md) documents this distinction.

Re-read status after the command. Confirm the intended destination is leader and the original member is a follower before stopping anything. If leadership changed independently while preparing the request, rediscover the leader and reassess rather than repeatedly issuing the same command.

Applications should already tolerate transient unavailable responses with bounded retries appropriate to each operation. A write timeout can leave its outcome uncertain, so a retry needs an idempotent operation or a state check. Leadership transfer does not remove that client responsibility.

## Drain Client Traffic Separately

Remove the maintenance endpoint from the service discovery, load balancer, or client endpoint configuration used by your applications. Keep the other healthy endpoints available. Understand that a long-lived gRPC connection can outlive a service-discovery change.

Observe traffic and connection behavior, then allow a bounded drain interval consistent with the clients' deadlines. Do not wait forever for watch connections to finish naturally; watches are long-lived by design. Clients must reconnect and resume starting at the revision after their last fully processed revision, or rebuild their state if the required history has been compacted.

Do not block peer traffic as a substitute for draining client traffic. Peers maintain consensus and replication while the old leader is still running as a follower. Client routing and peer membership have different lifecycles.

## Choose Restart or Replacement

For a temporary operating-system restart or an offline disk move that preserves identity, stop the member cleanly and keep its membership record. Restart it with its original complete state and verified configuration. Confirm it catches up before restoring client traffic and before maintaining another voter.

For permanent replacement, stop and isolate the old process, then remove its verified membership ID through a healthy endpoint. Add the replacement with an empty data directory as a learner, using the exact returned membership configuration and `initial-cluster-state=existing`. Verify its replication progress and learner status, then request promotion once it has caught up. A learner can fail the ordinary client readiness check by design; require that check and normal client operations to succeed after promotion.

Do not reuse a removed member's old directory to represent the newly added member. A matching hostname does not make their identities equivalent. The [runtime reconfiguration guide](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/) describes the relevant member replacement rules.

## Define the Abort Conditions

Pause maintenance if the transfer fails, the destination starts lagging, another voter becomes unavailable, or application errors exceed the agreed budget. If the original member has not been removed and its data is intact, returning it to service may restore the previous operating margin.

After permanent removal, recovery follows the new membership configuration. Do not attempt a rollback by starting the removed identity. Record the old and new member IDs, transfer time, maintenance steps, and final endpoint status so the next operator can tell which state is authoritative.

## Conclusion

Transfer leadership to a healthy voter, verify the result, and drain client traffic through its own controls. Preserve identity for a temporary restart and use explicit membership replacement for a permanent change. Complete one member's recovery before consuming another quorum failure slot.

## Official Documentation

- [etcdctl move-leader command](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
- [Runtime reconfiguration](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [etcd failure modes](https://etcd.io/docs/v3.7/op-guide/failures/)
- [API operation and watch guarantees](https://etcd.io/docs/v3.7/learning/api_guarantees/)
