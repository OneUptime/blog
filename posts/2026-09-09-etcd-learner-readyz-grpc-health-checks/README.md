# Why an etcd Learner Can Pass a Probe but Reject Client Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Monitoring, gRPC, High Availability, Troubleshooting

Description: Distinguish etcd learner liveness, readiness, and supported RPCs, including version-specific non_learner checks and probe exclusions.

---

A successful HTTP probe does not necessarily establish that an etcd member can serve your application's requests. Learners are the clearest example: they replicate data but do not participate as voters, and their supported client RPCs are restricted.

There is also a version-sensitive correction to a common assumption: the default `/readyz` handler in the upstream etcd v3.6.0 and v3.7.1 source includes a `non_learner` check. On those versions, a learner should fail the complete readiness probe. If it returns success, inspect the exact URL, exclusions, backend, and binary before concluding that `/readyz` inherently accepts learners. See the tagged [v3.7.1 health handler](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/etcdhttp/health.go).

## Separate three questions

A useful health design distinguishes these questions:

| Check | Question it answers | Typical use |
| --- | --- | --- |
| Liveness | Can this process service its local health operation? | Restart decisions with conservative thresholds |
| Replication progress | Is this learner receiving and applying state? | Membership maintenance |
| Application readiness | Can this endpoint serve the required authenticated RPCs? | Client routing |

Restarting a healthy learner because it fails application readiness prevents it from finishing its join. Conversely, adding every live learner to a general client pool sends workloads to an endpoint that intentionally rejects some operations.

A status request is useful for monitoring identity and Raft progress. It is not equivalent to a put, watch, or linearizable read. The upstream [RPC support logic](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/util.go) permits serializable range requests on learners while rejecting the ordinary linearizable range path.

## Inspect the full probe directly

Bypass load balancers and target the learner's own client address. For mutual TLS, supply the established operator credentials:

```bash
curl --silent --show-error \
  --cacert /etc/etcd/pki/ca.crt \
  --cert /etc/etcd/pki/operator.crt \
  --key /etc/etcd/pki/operator.key \
  --write-out '\nHTTP %{http_code}\n' \
  'https://etcd4.example.com:2379/readyz?verbose'
```

Read both the status code and the individual check output. The verbose handler can show successful local and linearizable read checks while `non_learner` fails. Internal HTTP health checks are not identical to going through the public gRPC interceptor, which explains why an internal check and a client request may have different results.

Compare this with the configured probe URL. An exclusion changes the meaning of success:

```text
/readyz?verbose&exclude=non_learner
```

This URL is a diagnostic example, not the recommended readiness configuration for a general client pool. Upstream v3.7.1 can return success on a healthy learner when that check is excluded. A subcheck such as `/readyz/serializable_read` is also narrower than the complete `/readyz` endpoint. `/livez` and the older `/health` endpoint have their own semantics and must not be treated as interchangeable aliases.

If the full direct probe unexpectedly succeeds, confirm the server version, whether the binary is downstream-patched, and whether a proxy served or cached the response. Verify the same backend identity using a direct status RPC. During a rolling upgrade, evaluate each member's actual release rather than assuming one cluster version describes every process.

## Test the relevant RPC behavior

Configure administrative TLS options in `ETCDCTL_CACERT`, `ETCDCTL_CERT`, and `ETCDCTL_KEY`, then query the learner directly:

```bash
etcdctl --endpoints=https://etcd4.example.com:2379 \
  endpoint status --write-out=table
etcdctl --endpoints=https://etcd4.example.com:2379 \
  --command-timeout=5s get /diagnostics/read-probe --consistency=s
etcdctl --endpoints=https://etcd4.example.com:2379 \
  --command-timeout=5s get /diagnostics/read-probe --consistency=l
```

On the upstream versions discussed here, the serializable read is supported, while the normal linearizable read is rejected for a learner. Puts and normal watch streams are also unsuitable for a learner endpoint. Do not describe this as every gRPC request failing: supported maintenance and local-read operations are valuable for diagnosing the join.

A learner's local read can be stale and is not a substitute for the application's chosen consistency level. Use a key and identity for which the probe has permission, so an RBAC denial does not masquerade as a role or connectivity failure. A missing authorized probe key is still a valid read response.

## Build routing from role and operation

Keep learners out of the ordinary application endpoint list until promotion succeeds. Use membership or status data to identify the role, and require the complete readiness check appropriate to the deployed release. Add a bounded authenticated operation check if the routing decision must establish application permissions as well as server readiness.

Do not use a write on every short-interval load-balancer probe without considering workload and cleanup. A bounded read can validate the ordinary read path; a separate low-frequency synthetic transaction can validate write availability if that is part of your service objective. Neither check proves arbitrary business operations or large requests will succeed.

For a learner's maintenance monitor, track process availability, Raft applied-index progress, snapshot transfer, and disk errors. Keep that monitor distinct from a probe whose failure would restart the member. Use timeouts and sustained failure thresholds so a temporary catch-up pause does not trigger a destructive restart loop.

## Verify the transition after promotion

Request promotion only through the normal membership workflow after the learner catches up. Let etcd reject an unsafe promotion. After success, confirm the role changed, the full `/readyz` check succeeds, and the normal authenticated RPC path works before adding the endpoint to client routing.

In staging, test the before-and-after matrix explicitly: learner status, local read, linearizable read, full readiness, excluded readiness, and the same requests after promotion. That makes probe assumptions reviewable whenever you upgrade etcd or change a proxy.

## Conclusion

A learner can be alive and replicating while being unsuitable for ordinary client traffic. On upstream v3.6.0 and v3.7.1, complete readiness includes a learner check; investigate exclusions and routing when observed behavior differs, and validate the RPCs your application actually needs.

## Official Documentation

- [etcd monitoring endpoints](https://etcd.io/docs/v3.7/op-guide/monitoring/)
- [v3.7.1 readiness implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/etcdhttp/health.go)
- [v3.7.1 learner RPC support](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/util.go)
- [v3.7.1 stream interception](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/v3rpc/interceptor.go)
