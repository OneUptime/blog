# How to Monitor cloud-controller-manager Health: Leader Leases, Reconcile Errors, and API Throttling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Monitoring, Prometheus, Leader Election, API Throttling

Description: Monitor CCM process health, active leadership, Node and route convergence, provider API failures, and Kubernetes client throttling with actionable alerts.

---

A `Running` cloud-controller-manager (CCM) Pod does not prove that its CCM process is healthy. In a highly available deployment, most replicas are expected standbys. The real service-level question is whether one healthy leader is reconciling Nodes, routes, and Services fast enough without being denied or throttled by Kubernetes or the provider API.

Monitor four layers together:

1. process availability and restart health;
2. leader-election continuity;
3. reconciliation outcomes and Kubernetes object symptoms; and
4. Kubernetes and cloud API latency, denial, quota, and throttling.

Provider CCMs can add or rename metrics, endpoints, and controllers. Start with the provider's release documentation, then use the common Kubernetes metrics where exported.

## Discover the Actual Deployment

Do not assume one namespace, workload kind, label, port, or Lease name:

```bash
kubectl get deploy,daemonset,pod -A -o wide | grep -i cloud-controller
kubectl get leases -A
kubectl get service -A | grep -i cloud-controller
# If Prometheus Operator CRDs are installed:
kubectl get servicemonitor,podmonitor -A | grep -i cloud-controller
kubectl get pod -n CCM_NAMESPACE CCM_POD -o yaml
```

Record image digest, command, replica placement, ServiceAccount, probes, metrics bind address, TLS/authentication, and leader-election flags. A distribution or managed service may hide the CCM; use its supported control-plane telemetry instead of scraping an undocumented endpoint.

## Layer 1: Process and Pod Health

Alert on unavailable desired replicas, crash loops, OOM kills, failed image pulls, probe failures, and all replicas concentrated in one failure domain. Multiple replicas improve failover, not throughput, because leader election normally makes one replica active.

Useful Kubernetes signals include:

- desired versus available Deployment or DaemonSet replicas;
- Pod restart count and last termination reason;
- CPU throttling, memory working set, and OOM events;
- pending scheduling due to the uninitialized or control-plane taint;
- readiness and liveness probe failures; and
- image or credential errors during rollout.

Do not define readiness as “this replica is leader.” Standbys should remain healthy and running so they can take over quickly. Use the provider's built-in probes unchanged unless its documentation describes safe customization.

Kubernetes exposes stable component health-check metrics at `/metrics/slis` where the implementation enables them:

```promql
kubernetes_healthcheck
kubernetes_healthchecks_total
```

Both metrics have `name` and `type` labels; `kubernetes_healthchecks_total` also has a `status` label. Confirm the endpoint and authorization on the deployed provider before creating a scrape job.

## Layer 2: Leader Lease Health

Inspect the actual Lease:

```bash
kubectl get lease -n CCM_NAMESPACE CCM_LEASE -o json | jq '.spec | {
  holderIdentity,
  acquireTime,
  renewTime,
  leaseDurationSeconds,
  leaseTransitions
}'
```

Healthy HA behavior has one current holder, `renewTime` advancing inside the configured lease duration, and infrequent transitions. Alert when:

- no holder exists beyond the startup allowance;
- `renewTime`, allowing for clock skew and observation delay, becomes older than the lease duration;
- transitions rise repeatedly without intentional rollout; or
- all replicas log API errors retrieving, creating, or updating the Lease.

The common alpha metric `leader_election_slowpath_total{name=...}` counts slow-path lease renewal behavior. With classic, non-coordinated client-go leader election, alert on an increase correlated with API latency, rather than on its lifetime value:

```promql
sum by (name) (increase(leader_election_slowpath_total[10m])) > 0
```

In client-go v0.36 coordinated leader election, every normal renewal uses this path and increments the counter, so this expression is not a degradation alert; use Lease freshness, transitions, and API request signals instead. Tune the window to the environment and exclude planned control-plane rollouts. Lease object monitoring is still valuable because metric scraping can fail at the same time as the component.

## Layer 3: Reconciliation and Object Symptoms

Logs are often the most portable reconcile signal across providers. Collect structured logs from every replica with Pod identity, then distinguish leader and standby. Count errors by controller, operation, cloud error code, and retry class while controlling high-cardinality resource identifiers.

Watch user-visible convergence:

```bash
# Nodes waiting for cloud initialization
kubectl get nodes -o json | jq '[.items[] | select(
  any(.spec.taints[]?; .key=="node.cloudprovider.kubernetes.io/uninitialized")
)] | length'

# Empty provider identity, if the provider requires ProviderID
kubectl get nodes -o json | jq '[.items[] | select((.spec.providerID // "") == "")] | length'

# LoadBalancer Services without a reported ingress, plus recent Events
kubectl get service -A -o json | jq -r '.items[] |
  select(.spec.type=="LoadBalancer") |
  select(((.status.loadBalancer.ingress // []) | length) == 0) |
  [.metadata.namespace, .metadata.name, (.spec.loadBalancerClass // "<default>")] | @json'
kubectl events -A | grep -iE 'loadbalancer|cloud|route|initialize'
```

Good alerts represent age, not just existence:

- Node remains uninitialized beyond the normal bootstrap objective;
- Node initial sync latency regresses;
- new `LoadBalancer` Service assigned to this CCM has no entries in `.status.loadBalancer.ingress` beyond its provisioning objective;
- controller warning Events repeat for the same reason;
- cloud routes fail to converge after Node or Pod CIDR changes; or
- stale Node objects persist after confirmed instance deletion.

Common upstream CCM metrics include:

- `node_controller_cloud_provider_taint_removal_delay_seconds`;
- `node_controller_initial_node_sync_delay_seconds`;
- `route_controller_route_sync_total` in Kubernetes v1.36; and
- standard process, Go runtime, workqueue, leader-election, and REST client metrics where the provider exposes them.

Metric stability matters. The Node delay and route metrics are alpha in the v1.36 reference, so dashboards and alerts must tolerate change across upgrades. Provider-specific Service and API metrics may have separate contracts.

## Layer 4: Kubernetes API Pressure

CCM talks to the Kubernetes API through client-go. Monitor request errors by status code and HTTP method, and request latency and client-side throttling by verb and host; do not add raw URL paths as metric labels. Common client metrics can include `rest_client_requests_total`, `rest_client_request_duration_seconds`, and `rest_client_rate_limiter_duration_seconds`, depending on the linked libraries and release.

Investigate:

- HTTP 401/403 for expired credentials or RBAC regression;
- HTTP 409 from write conflicts or competing controllers;
- HTTP 429 and client-side rate-limiter delay;
- high list/watch latency or repeated watch resets; and
- API server Priority and Fairness rejection or queuing.

Do not immediately raise CCM QPS and burst. First find duplicate controller installations, too many failing resources, watch instability, excessive resync, or a broader API server bottleneck. Increasing client limits can shift the outage to the API server.

## Provider API Monitoring

The provider API is a separate dependency. Combine CCM logs with the provider's official audit and monitoring service. Alert on:

- authentication and authorization denial;
- rate limit or quota exhaustion;
- resource quota such as load balancer, route, address, target, or firewall limits;
- API endpoint latency and availability;
- invalid or expired workload identity tokens;
- repeated create/delete calls indicating ownership conflict; and
- orphaned resources or drift after failed reconciliation.

Use provider request IDs to correlate one Kubernetes Event or log entry with the cloud audit record. Avoid parsing credentials or entire request bodies into metrics.

Cloud rate limiting can be asymmetric: Node discovery may work while load-balancer mutation is throttled. Break error dashboards down by controller and API operation.

## Suggested Alerts

Use objectives based on normal measured behavior:

| Alert | Meaning | First check |
| --- | --- | --- |
| No fresh CCM Lease holder | No active reconciler | API reachability, Lease RBAC, replica status |
| Frequent Lease transitions | Leader instability | restarts, API latency, network partitions, CPU starvation |
| Uninitialized Node age high | Node controller cannot complete | leader logs, ProviderID mapping, IAM, API quota |
| Pending CCM-managed LB Service age high | Service controller or provider mutation failed | Service Events, class, annotations, IAM/quota |
| Provider 401/403 increase | Credential or IAM regression | active principal and cloud audit log |
| Provider 429 increase | Throttling/quota pressure | duplicate reconcilers, request volume, provider limits |
| Kubernetes REST 429 increase | API pressure | client QPS, API Priority and Fairness, watch churn |
| Node sync latency regression | Slow initialization | provider API latency and controller queue |
| Route sync stops after Node changes | route controller stalled or disabled | Pod CIDRs, feature/flags, leader logs, cloud routes |

Page on user-visible control-plane loss or sustained failure; route isolated transient retries to a lower-severity ticket. Avoid paging on every standby replica's normal lack of leadership.

## Secure the Metrics Path

Control-plane metrics can reveal node names, resource activity, endpoints, and provider behavior. Keep the metrics listener private, use TLS and authentication as supported, grant Prometheus only required access, and apply NetworkPolicy where it does not break bootstrap. Do not expose CCM metrics through a public `LoadBalancer` Service.

After each CCM upgrade, re-render the manifest, diff metric names against the provider and Kubernetes references, and test alerts with a controlled leader restart and a disposable reconciliation canary.

## Official Documentation

- [Kubernetes Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes: Metrics for system components](https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes v1.36 route sync metric](https://kubernetes.io/blog/2026/05/15/ccm-new-metric-route-sync-total/)
- [Kubernetes: API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)

## Conclusion

Monitor CCM as a leader-elected reconciliation service, not a set of Running Pods. Prove a fresh Lease holder exists, measure Node and Service convergence, count controller-specific errors, and correlate Kubernetes client pressure with provider API audit data. The best alerts fire when cloud-backed Kubernetes state stops converging and direct the operator to the failing boundary.
