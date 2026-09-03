# `/readyz` Fails While `/livez` Passes: Reading Kubernetes API Server Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Health Check, HTTP Health Checks, Kubernetes Monitoring, Troubleshooting

Description: Interpret divergent kube-apiserver livez and readyz results, isolate the failing readiness check, and respond without causing avoidable restarts.

---

When kube-apiserver returns success from `/livez` but failure from `/readyz`, it is reporting two different truths:

- the process is alive enough that restarting it is not presently justified; and
- this replica should not receive normal API traffic yet, or should stop receiving new traffic.

That state is intentional during startup, some dependency failures, watch-cache initialization, and graceful shutdown. Restarting every replica whose readiness fails can turn a recoverable dependency problem into a control-plane outage.

## Use the Endpoint That Answers Your Question

The API server exposes `/livez` and `/readyz`. The older `/healthz` endpoint is deprecated.

| Endpoint | Operational question | Load-balancer action |
| --- | --- | --- |
| `/livez` | Is the process stuck or in a state that needs restart? | Do not use this alone to admit normal traffic |
| `/readyz` | Can this replica accept API requests now? | Keep it out of rotation while non-successful |

Machines should use the HTTP status code: `200` is success. The verbose body is for operators, not a stable parser contract.

From a working administrative kubeconfig, query through the normal endpoint first:

```bash
kubectl get --raw='/livez'
kubectl get --raw='/readyz'
kubectl get --raw='/readyz?verbose'
```

To distinguish one bad replica from a shared endpoint failure, target each control-plane node individually while retaining authentication and TLS verification:

```bash
kubectl --kubeconfig=/etc/kubernetes/admin.conf \
  --server=https://api-1.example.net:6443 \
  get --raw='/readyz?verbose'
```

Use a hostname or IP present in that replica's serving certificate. Do not add `--insecure-skip-tls-verify` merely to make a health check pass; that stops the probe from proving which server it reached.

## Read the Verbose Readiness Result

The exact checks vary by Kubernetes release and API server configuration. A healthy response commonly includes basic process checks, etcd, post-start hooks, and watch-cache initialization. Focus on lines marked as failed and correlate them with component logs and recent changes.

### `etcd` Fails

The process can remain live while it cannot complete storage operations. Check every configured `--etcd-servers` endpoint, DNS and routing from the API server host, etcd quorum and alarms, and the API server's etcd client CA, certificate, and key. Validate etcd with authenticated `etcdctl endpoint health` and `endpoint status` using the cluster's documented TLS material.

Do not “fix” readiness by excluding the etcd check. An API server unable to use its storage backend is not a safe target for ordinary requests.

### A Post-Start Hook Fails

The API server starts internal controllers and initialization hooks after the process begins listening. A hook that has not completed can hold readiness false while liveness remains true. Look for the exact hook name in kube-apiserver logs. Slow or failed initialization can follow API discovery problems, unavailable aggregated APIs, admission configuration errors, or storage latency; the hook name determines the next dependency to inspect.

### Watch-Cache Initialization Fails

Current kube-apiserver readiness waits for registered watch caches to initialize from etcd. This protects the control plane from sending client load to a replica whose caches are not ready. Check etcd latency, API server memory and CPU pressure, and logs for the affected resource rather than bypassing the protection.

### `shutdown` Fails

During graceful termination, readiness changes before the process stops serving. With `--shutdown-delay-duration`, `/readyz` fails immediately while `/livez` can remain successful during the delay. This gives a readiness-aware load balancer time to remove the backend before request draining begins.

If only a terminating replica shows this result, it is expected. Confirm that the load balancer actually withdraws it and that other replicas remain ready.

## Use Exclusions Only for Diagnosis

The health API supports an `exclude` query parameter, which can show whether one named check accounts for the overall failure:

```bash
kubectl get --raw='/readyz?verbose&exclude=etcd'
```

This is a debugging tool, not a repair. Excluding a dependency from a production load-balancer probe changes the meaning of “ready” and can route users to a replica Kubernetes deliberately marked unready. Record the full result before experimenting, because check names and availability can vary by release.

## Decide Whether the Fault Is Local or Shared

Probe every replica directly and through the load-balancer address:

- One replica fails: compare its kube-apiserver arguments, mounted files, clock, resource pressure, logs, and connectivity to etcd.
- Every replica fails the same check: suspect a shared service such as etcd, identity discovery, or a common configuration rollout.
- Direct probes pass but the load-balancer probe fails: inspect SNI, trusted CA, HTTP path, authentication, expected status, and source-network policy.
- Direct readiness fails but the load balancer still routes traffic: its check is only testing TCP reachability, using `/livez`, accepting the wrong statuses, or has thresholds too slow for the shutdown window.

Correlate endpoint transitions with `apiserver_request_total`, request latency, health SLI metrics, process/container restarts, and etcd metrics. A single snapshot cannot show whether readiness is briefly initializing or repeatedly flapping.

## Tune Recovery Without Hiding Failure

Configure the load balancer to require an exact successful readiness status and to verify TLS. Choose intervals and failure/success thresholds that remove a genuinely bad backend promptly without oscillating on one lost packet. Align detection time with the API server's graceful shutdown delay.

Keep liveness policy more conservative than readiness policy. Readiness may fail because a dependency is temporarily unavailable; repeated automatic restarts add load and erase useful in-process evidence. Restart only when liveness or direct diagnosis shows the process cannot recover.

After a fix, require `/readyz` to remain successful, run a small authenticated read through the shared endpoint, and watch error rate and latency. A `200` from `/livez` alone is not closure.

## Conclusion

`livez=200` and `readyz!=200` is a coherent signal: keep the process running but stop new API traffic to that replica. Use the verbose result to find the dependency, compare replicas directly with TLS intact, correct the underlying etcd, initialization, cache, or shutdown condition, and let readiness control load-balancer membership.

## Official References

- [Kubernetes: API Health Endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: kube-apiserver Command-Line Reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes: API Concepts and Watch Cache Initialization](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes: Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [etcd: How to Check Cluster Status](https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/)
