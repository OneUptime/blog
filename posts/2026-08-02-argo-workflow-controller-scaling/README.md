# Argo Workflow Controller Is Falling Behind: Tuning Workers, QPS, and Pod Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Workflow Controller, Scaling, Performance, QPS, Rate Limiting, Observability

Description: Diagnose an overloaded Argo Workflow controller and tune reconciliation workers, Kubernetes client QPS and burst, and Pod-creation rate limits without overwhelming the API server.

---

When the Argo Workflow controller falls behind, new nodes start late, completed Pods take too long to update Workflow status, CronWorkflows drift, and cleanup queues grow. Adding “more concurrency” in one place can make the incident worse: reconciliation workers, Kubernetes client request limits, Workflow parallelism, and Pod-creation rate limiting are separate controls.

The safe tuning sequence is:

1. identify which controller queue or dependency is slow;
2. give the controller enough CPU and memory;
3. add the worker type that is saturated;
4. raise Kubernetes client QPS/burst only when client-side throttling is the bottleneck and the API server has capacity;
5. tune Pod creation independently, with an explicit protection budget for the API server and scheduler.

## Confirm That the Controller Is the Bottleneck

First separate controller delay from Kubernetes Pod delay.

```bash
NS=workflows

kubectl get workflows -n "$NS"
kubectl get pods -n "$NS" -l workflows.argoproj.io/workflow -o wide
kubectl get deployment,pods -n argo -l app=workflow-controller
kubectl logs deployment/workflow-controller -n argo --since=30m
```

If Workflow nodes already have Pods and those Pods show `FailedScheduling`, image-pull failures, or volume-mount errors, the controller created the work. Fix the scheduler, registry, storage, or node problem instead.

Evidence of controller lag includes:

- Workflow changes sit in the controller queue for increasing periods;
- Pods have completed, but node phases update noticeably later;
- controller CPU is saturated or it is repeatedly OOM-killed;
- logs repeatedly report client-side throttling waits;
- the workflow, Pod cleanup, Workflow TTL, archive, or CronWorkflow queue grows continuously;
- controller reconciliation duration rises as Workflow size or event rate increases.

Also check API server health, admission webhooks, the persistence database, and DNS/network latency. A worker waiting on a slow dependency looks busy but will not become faster merely because more goroutines compete for that dependency.

## Use Argo's Controller Metrics

Argo exposes default controller metrics through the `workflow-controller-metrics` service, normally on port `9090`. Metrics can be collected through Prometheus-compatible scraping or OpenTelemetry according to the telemetry configuration.

The most useful signals for this incident are:

| Metric | What it tells you |
| --- | --- |
| `queue_depth_gauge` | Items currently waiting, by `queue_name` |
| `queue_latency` | Time an item waits before processing |
| `queue_duration` | Time queue items take to process |
| `queue_unfinished_work` | Work not yet completed |
| `workers_busy_count` | Busy workers by `worker_type` |
| `operation_duration_seconds` | Duration of one Workflow reconciliation operation |
| `client_rate_limiter_latency` | Time blocked by client-go QPS/burst limiting |
| `resource_rate_limiter_latency` | Delay imposed by the Pod-creation rate limiter |
| `k8s_request_duration` | Kubernetes API latency by kind, verb, and status |

The documented queue names include `workflow_queue`, `pod_cleanup_queue`, `workflow_ttl_queue`, `workflow_archive_queue`, and `cron_wf_queue`. This makes the response specific:

- a growing `workflow_queue` points to Workflow reconciliation capacity;
- a growing `pod_cleanup_queue` points to Pod cleanup workers;
- a growing `workflow_ttl_queue` points to Workflow TTL cleanup workers;
- CronWorkflow delay with a growing `cron_wf_queue` points to CronWorkflow workers;
- non-zero resource-rate-limiter latency points to deliberate Pod-creation throttling.

Metric names are emitted with Argo's configured namespace/prefix when exported. Confirm the exact series names and labels at the metrics endpoint for your release rather than copying a version-specific dashboard query blindly.

For a short diagnostic session, port-forward the controller metrics endpoint according to its TLS configuration:

```bash
kubectl -n argo port-forward deployment/workflow-controller 9090:9090
curl --insecure https://127.0.0.1:9090/metrics \
  | grep -E 'queue_depth|queue_latency|workers_busy|rate_limiter|operation_duration'
```

The current telemetry documentation defaults metrics TLS to enabled. If your deployment explicitly uses insecure metrics, use `http://` and omit `--insecure`.

## Step 1: Give the Controller CPU and Memory Headroom

Argo's official scaling guidance starts with vertical resources. Worker goroutines cannot run concurrently when the container is CPU-throttled, and increasing workers increases memory pressure and in-flight API work.

```bash
kubectl top pod -n argo -l app=workflow-controller
kubectl describe pod -n argo -l app=workflow-controller
kubectl get pod -n argo -l app=workflow-controller -o json \
  | jq '.items[].status.containerStatuses[] | {
      name,
      restartCount,
      lastState
    }'
```

Compare actual CPU with the configured request and limit. Inspect historical throttling and working-set metrics if available; a single `kubectl top` sample can miss bursts. Look for `OOMKilled`, restarts, long garbage-collection pauses, and node pressure.

The controller's informer caches hold live Workflows, Pods, and related watched objects. Memory therefore scales with object count and size, not just currently running Pods. Large inline specs and node status also increase serialization and reconciliation cost. Node-status offloading can help Workflows that exceed the Kubernetes object limit, but the controller and clients still perform work to reconstruct and update those Workflow states.

Set resource requests from measured steady-state demand plus headroom, and use a memory limit that does not cause routine OOM termination. Avoid a very low CPU limit on a controller expected to handle bursts.

## Step 2: Increase the Correct Workers

Argo exposes separate controller arguments for separate queues:

- `--workflow-workers` processes Workflow reconciliation;
- `--workflow-ttl-workers` processes TTLStrategy deletion;
- `--pod-cleanup-workers` processes PodGC cleanup;
- `--cron-workflow-workers` processes CronWorkflow events in Argo Workflows v3.5 and later.

A Deployment fragment might look like this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-controller
  namespace: argo
spec:
  template:
    spec:
      containers:
        - name: workflow-controller
          args:
            - --workflow-workers=64
            - --workflow-ttl-workers=8
            - --pod-cleanup-workers=16
            - --cron-workflow-workers=8
```

This is an illustration, not a universal target. Preserve all existing controller arguments when modifying a rendered Deployment, and set values in the Helm/Kustomize/GitOps source of truth.

Increase one saturated worker pool in a measured step, then observe:

- did its queue depth and latency fall?
- are busy workers routinely at the configured count?
- did controller CPU, memory, API latency, or error rate become unhealthy?
- did another queue or downstream service become the bottleneck?

If `workflow_queue` is deep while Workflow workers are busy and CPU has headroom, more `--workflow-workers` can help. Increasing Pod cleanup workers will not make Workflow reconciliation faster. Likewise, do not increase Workflow workers to address only a TTL deletion backlog.

## Step 3: Tune Kubernetes Client QPS and Burst

The controller's Kubernetes client rate limiter protects the API server. Current Argo scaling documentation gives these controller defaults:

- `--qps=20` average client requests per second;
- `--burst=30` temporary burst capacity.

Logs such as the following identify **client-side** throttling:

```text
Waited for 7.09s due to client-side throttling, not priority and fairness
```

Confirm the signal in both logs and `client_rate_limiter_latency`. Then verify the Kubernetes API server can safely accept more traffic. A measured adjustment could be:

```yaml
containers:
  - name: workflow-controller
    args:
      - --qps=50
      - --burst=75
```

Keep burst greater than QPS so short reconciliation bursts can pass without immediately waiting. Raise values gradually while watching API request latency, error status codes, API Priority and Fairness behavior, etcd health, and traffic from every cluster controller—not only Argo.

Do not interpret HTTP `429 Too Many Requests` or high API server latency as permission to keep raising client QPS. A client-side wait with a healthy server can justify a higher client budget. Server-side rejection means the shared control plane is already applying backpressure and needs capacity, workload reduction, or fairer traffic policy.

More Workflow workers often generate more Kubernetes calls. If workers are raised but QPS is unchanged, they may simply spend more time blocked by client-side throttling. If QPS is raised without enough workers or CPU, it may have no useful effect. Tune these controls together from observed saturation.

## Step 4: Treat Pod Creation as a Separate Rate Limit

Creating Pods is heavier than many reads or status patches. Argo provides `resourceRateLimit` in the Workflow Controller ConfigMap to globally constrain Pod creation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  config: |
    resourceRateLimit:
      limit: 10
      burst: 25
```

`limit` is the average Pod-creation rate and `burst` allows a short burst before the average is enforced. Despite the setting's name, Argo documents that it applies only to Pod creation—not to ConfigMap, PVC, or other resource creation.

This limiter is useful when a large fan-out could flood the API server. It can also be the intentional reason nodes wait. If `resource_rate_limiter_latency` is non-zero and the API server plus scheduler have demonstrated headroom, raise `limit` and `burst` gradually. If cluster components are already strained, keep or lower the protection and accept a controlled launch rate.

Do not confuse this with Workflow parallelism:

- `resourceRateLimit` shapes how quickly Pod create requests are issued cluster-wide by that controller;
- Workflow `spec.parallelism` caps concurrently executing Pods/nodes within one Workflow;
- controller `parallelism` caps concurrent Workflows;
- namespace parallelism caps concurrent Workflows per namespace;
- synchronization mutexes and semaphores enforce application concurrency contracts.

Use Workflow/namespace controls for fairness and business-resource limits. Use Pod-creation limiting to protect Kubernetes from bursts.

## Reduce Avoidable Controller Work

Tuning capacity is only half the fix. Lower event and object cost where practical:

- bound large loops with Workflow or template `parallelism`;
- use semaphores for scarce external systems rather than allowing repeated failures and retries;
- add retry backoff so a dependency outage does not create a reconciliation storm;
- clean up completed Pods and Workflow CRs with deliberate retention policies;
- use node-status offloading for Workflows too large for Kubernetes resources;
- store large data as artifacts instead of output parameters or inline manifests;
- investigate slow or failing admission webhooks called during Pod creation;
- monitor persistence database latency when archiving or offloading is enabled.

Controller-wide `parallelism` and `namespaceParallelism` can keep the active Workflow set within tested capacity:

```yaml
data:
  config: |
    parallelism: 100
    namespaceParallelism: 25
```

Those are example values only. Argo notes that Workflows blocked by other mechanisms can still count toward controller parallelism, so inspect synchronization and Workflow states when apparent utilization is lower than the cap.

## Do Not Scale Active Controllers Like Stateless Web Servers

Argo's scaling documentation is explicit: the Workflow controller cannot be horizontally scaled as several ordinary active replicas. Multiple replicas provide a hot standby through leader election; they do not multiply active reconciliation throughput. The `is_leader` metric identifies the leader, and standby controllers do not run the workload as extra workers.

For scale beyond one controller's vertical capacity, shard intentionally:

- run one installation per namespace with namespaced mode; or
- run controller instances with distinct instance IDs and label Workflows for the intended controller.

An instance-ID shard is selected with the label:

```yaml
metadata:
  labels:
    workflows.argoproj.io/controller-instanceid: batch-a
```

Design sharding before deployment: make ownership mutually exclusive, route CLI submissions consistently, define per-shard observability and retention, and account for shared API server and database capacity. Two controllers both watching the same unlabeled objects is not a throughput strategy.

## A Controlled Tuning Runbook

1. Record queue depth/latency, busy workers, operation duration, limiter latency, controller resources, and API health.
2. Identify one bottleneck: CPU/memory, a particular worker queue, client QPS, Pod-creation rate, or a downstream dependency.
3. Change one related control in a small increment through the deployment source of truth.
4. Roll out and compare the same metrics during a representative workload.
5. Stop increasing when queue latency meets the objective or a downstream saturation signal rises.
6. Load-test burst behavior, not only steady state.
7. Keep a rollback value and document the cluster/API capacity assumptions behind the final numbers.

Useful validation commands include:

```bash
kubectl rollout status deployment/workflow-controller -n argo
kubectl get pods -n argo -l app=workflow-controller -o wide
kubectl logs deployment/workflow-controller -n argo --since=15m \
  | grep -E 'throttl|Waited|429|timeout|rate limit|OOM'
kubectl get events -A --sort-by=.lastTimestamp \
  | tail -n 100
```

A successful tuning change drains the affected queue faster without transferring failure to the API server, scheduler, database, or workload nodes. That is the real target—not the largest worker or QPS number the controller accepts.

## Official Documentation

- [Argo Workflows: Scaling](https://argo-workflows.readthedocs.io/en/latest/scaling/)
- [Argo Workflows: Metrics](https://argo-workflows.readthedocs.io/en/latest/metrics/)
- [Argo Workflows: Telemetry configuration](https://argo-workflows.readthedocs.io/en/latest/telemetry-configuration/)
- [Argo Workflows: Workflow Controller ConfigMap](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/)
- [Argo Workflows: Limiting parallelism](https://argo-workflows.readthedocs.io/en/latest/parallelism/)
- [Argo Workflows: Synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Argo Workflows: Running at massive scale](https://argo-workflows.readthedocs.io/en/latest/running-at-massive-scale/)
- [Kubernetes: API Priority and Fairness](https://kubernetes.io/docs/concepts/cluster-administration/flow-control/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
