# Rolling Out Kubernetes Rightsizing Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Performance, Capacity Planning

Description: Stage Kubernetes resource changes through canaries with explicit availability, performance, scheduling, and rollback gates.

---

A resource-only change can be as risky as a code release. Lower memory limits can cause delayed OOM kills, lower CPU limits can create tail-latency regressions, and larger requests can leave pods pending. Roll it out with the same progressive controls used for application changes.

## Define success before editing YAML

Write a change hypothesis and guardrails:

```yaml
hypothesis: 500m CPU and 768Mi memory preserve the SLO at lower cost
baseline:
  cpu_request: 900m
  memory_request: 1Gi
gates:
  error_rate_percent: 0.5
  p99_latency_ms: 350
  cpu_throttled_ratio: 0.05
  oom_kills: 0
  pending_pod_seconds: 30
observation: two daily peaks
```

Use workload-specific thresholds. Compare canary and control over the same traffic and dependency conditions. An absolute threshold alone can miss a regression when both remain below an overly generous alert.

## Isolate the canary

Kubernetes Deployment rolling updates do not natively split traffic by resource configuration. For a controlled canary, create a second Deployment with the same image and configuration but different resource values. Give its pods a distinct version label and ensure the two Deployments have non-overlapping selectors; an existing Deployment selector is immutable. Route a small share through a service mesh, gateway, or application-level partition.

If precise traffic weighting is unavailable, canary on one low-risk tenant, worker partition, or replica and compare it carefully. Avoid sending all unusually easy traffic to the canary.

Change one sizing dimension at a time where possible. Lower the request, observe scheduling and HPA, then separately evaluate a limit. This preserves attribution.

## Configure rollout safety

For a standard rolling Deployment, use availability settings appropriate to replica count. This partial manifest shows the rollout settings; merge them into your existing Deployment manifest, retaining its required `spec.selector` and `spec.template`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
spec:
  replicas: 8
  minReadySeconds: 60
  progressDeadlineSeconds: 600
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

`minReadySeconds` requires a new pod to remain ready before it counts as available. `progressDeadlineSeconds` makes stalled progress visible, but the Deployment controller does not automatically roll back simply because the deadline is exceeded. Automation or an operator must act on the condition.

Use startup and readiness probes that represent actual ability to serve. A process being alive does not mean its cache is warm or its connection pool is ready.

A PodDisruptionBudget protects against supported voluntary evictions such as a node drain. It does not limit how many pods a Deployment controller can make unavailable during its own rolling update. Set the Deployment strategy correctly as well.

## Gate every stage on four layers

### Application

Watch throughput, error rate, tail latency, deadline misses, retry rate, queue age, and saturation. Break down by endpoint or operation so a cheap path does not hide an expensive one.

### Container

Watch CPU usage and throttling, memory working set, OOM events, restarts, page faults, and garbage collection. Memory regressions may need several traffic cycles to appear.

### Kubernetes

Watch desired and available replicas, HPA behavior, unschedulable pods, evictions, readiness transitions, and rollout conditions.

### Node and cost

Watch allocatable resources, fragmentation, node autoscaler actions, new node types, and actual billed node hours. Lower pod requests only save money when enough capacity becomes removable or avoids future growth.

## Use explicit rollout stages

A typical sequence is:

1. static replay or load test;
2. one canary replica at 1 percent of traffic;
3. 5 percent through one representative peak;
4. 25 percent through failure and scale-out tests;
5. 50 percent through the required observation window;
6. full rollout with the old ReplicaSet or manifest retained.

Pause automatically when telemetry is missing. Absence of an OOM metric is not evidence that no OOM occurred if the collector is unhealthy.

## Make rollback operational

Specify who or what can rollback, the exact command or Git revert, and the capacity consequences. Restoring larger requests can make replacement pods unschedulable if nodes were already consolidated. During the experiment, retain enough node capacity or verify that node scale-up meets the recovery-time objective.

Example operational checks:

```bash
kubectl -n payments rollout status deployment/checkout
kubectl -n payments get deployment checkout -o jsonpath='{.status.conditions}'
kubectl -n payments rollout undo deployment/checkout
```

For a two-Deployment canary, rollback normally means routing traffic to the stable Deployment and scaling the canary down, not running `rollout undo` on the stable workload.

## Close the experiment with evidence

Compare cost per successful request, not only request reduction. Record the final manifest, observation timestamps, excluded incidents, rollback status, and next review date. Delete temporary routing only after verifying that all traffic uses the intended stable workload.

## Conclusion

Treat Kubernetes rightsizing as a progressive release. Isolate a representative canary, gate application, container, cluster, and cost signals, and preserve capacity for rollback. Kubernetes surfaces stalled rollouts, but your automation must decide when to stop or reverse the change.

## Official Documentation

- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [kubectl rollout reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/)
