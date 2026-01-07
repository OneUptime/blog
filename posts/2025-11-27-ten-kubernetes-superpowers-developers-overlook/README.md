# 10 Kubernetes Superpowers Developers Overlook (and How to Use Them)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps, Observability, Automation, Security, Cost Optimization

Description: Ten field-tested Kubernetes capabilities - topology spread, disruption budgets, admission policies, autoscaling guardrails, and more - that most teams ignore but instantly boost resilience, velocity, and cost control.

---

Kubernetes has been around long enough that we all "kind of" know how Deployments, Services, and Ingress work. Yet production incidents keep reminding us that the platform hides dozens of smarter defaults most teams never switch on. These are the ten features I audit for any cluster before we even talk about service meshes or AI copilots.

Pro tip: if you still need a friendly refresher on the control-plane basics, start with [Learn Kubernetes Step by Step](https://oneuptime.com/blog/post/2025-11-27-learn-kubernetes-step-by-step/view) and then come back to flip these advanced switches.

## 1. Topology Spread Constraints Beat Basic Anti-Affinity

Pod anti-affinity stops replicas from landing on the same node, but it does not understand zones or racks. `topologySpreadConstraints` does, giving you precise skew control across zones, regions, or even custom labels.

This configuration ensures your 4 replicas are evenly distributed across availability zones, improving resilience against zone failures.

```yaml
spec:
  replicas: 4
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1                              # Max difference in Pod count between zones
          topologyKey: topology.kubernetes.io/zone  # Spread across zones
          whenUnsatisfiable: DoNotSchedule        # Block scheduling if spread is violated
          labelSelector:
            matchLabels:
              app: payments                       # Apply to Pods with this label
```

- `maxSkew: 1` ensures no zone runs more than one extra replica compared to its peers.
- `whenUnsatisfiable: DoNotSchedule` forces the scheduler to wait for capacity instead of piling pods onto one zone.
- Works beautifully with bare metal too - label racks/nodes however you want.

## 2. PodDisruptionBudget + maxSurge Save Your Rollouts

Every `kubectl drain` or node upgrade evicts pods. Without a `PodDisruptionBudget` (PDB), a single drain can drop your entire Deployment. Pair a PDB with a Deployment surge so upgrades stay safe.

A PDB ensures that node maintenance never reduces your Pod count below a safe threshold, while `maxSurge` ensures new Pods spin up before old ones terminate.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payments-pdb
spec:
  minAvailable: 3                 # Always keep at least 3 Pods running
  selector:
    matchLabels:
      app: payments               # Protect Pods with this label
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1                 # Add 1 new Pod before removing old ones
      maxUnavailable: 0           # Never remove a Pod until replacement is Ready
```

```mermaid
graph LR
  PDB[PodDisruptionBudget] -->|blocks| Drain[Node Drain]
  Drain -->|evicts| Deployment
  Deployment -->|respects| Strategy[maxSurge / maxUnavailable]
```

- The drain will pause if removing a pod violates `minAvailable`.
- `maxSurge: 1` lets Kubernetes add a fresh pod before deleting the old one - zero downtime, even during cluster upgrades.

## 3. PriorityClasses Prevent Thundering Herds

Background Jobs (backfills, data science experiments) love to steal CPU from real-time APIs. Create two `PriorityClasses` so the scheduler knows which pods it may preempt.

Higher priority values mean more important workloads. When resources are scarce, lower-priority Pods get evicted first.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-api
value: 100000                     # High priority - protected from preemption
preemptionPolicy: PreemptLowerPriority  # Can evict lower-priority Pods
---
kind: PriorityClass
metadata:
  name: batch-low
value: 1000                       # Low priority - evicted first during pressure
preemptionPolicy: Never           # Never preempt other Pods
```

Set `priorityClassName` on each Deployment. Now, if autoscaling squeezes the cluster, Kubernetes evicts the low-priority jobs first and keeps latency-sensitive workloads alive.

## 4. Blend Requests, Limits, and HPAs with Stabilization Windows

Most throttling complaints come from mismatched requests/limits. Set `requests` to the 90th percentile, `limits` ~1.5x requests, and then let the Horizontal Pod Autoscaler scale based on actual load. Stabilization windows prevent oscillation.

This HPA behavior configuration prevents rapid scale-down after traffic spikes, giving you time to verify the load is truly decreasing.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 3                  # Never go below 3 Pods
  maxReplicas: 15                 # Cap at 15 Pods
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 30               # Remove at most 30% of Pods per period
          periodSeconds: 60       # Evaluate every 60 seconds
```

- The 5-minute stabilization window stops the HPA from removing pods too aggressively right after a spike.
- Combine with `--horizontal-pod-autoscaler-downscale-stabilization` on the controller manager for cluster-wide defaults.

## 5. LimitRanges and ResourceQuotas Stop Noisy Neighbors

Namespaces without default requests become a free-for-all. Apply a `LimitRange` so every pod gets CPU/memory defaults, then cap the namespace using a `ResourceQuota`.

LimitRange sets default resource requests and limits for containers that don't specify them, ensuring every Pod has sane defaults.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: web
spec:
  limits:
    - defaultRequest:             # Applied if container omits requests
        cpu: 200m
        memory: 256Mi
      default:                    # Applied if container omits limits
        cpu: 500m
        memory: 512Mi
      type: Container
```

Pair it with a ResourceQuota to cap total resource consumption in the namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: web-budget
  namespace: web
spec:
  hard:
    requests.cpu: "8"             # Max 8 CPU cores requested across all Pods
    requests.memory: 16Gi         # Max 16GB memory requested
    pods: "40"                    # Max 40 Pods in this namespace
```

Now every service in the `web` namespace must declare sane resource values, and runaway deployments cannot spin up infinite replicas.

## 6. CronJobs Need Concurrency Policies to Avoid Duplicate Work

By default, CronJobs will happily start a new Job even if the previous one is still running. Add `concurrencyPolicy: Forbid` and `startingDeadlineSeconds` so DevOps is not paged twice for the same task.

This CronJob runs nightly at 1 AM but skips execution if a previous run is still in progress, preventing resource contention and duplicate processing.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-compaction
spec:
  schedule: "0 1 * * *"           # Run at 1:00 AM every day
  concurrencyPolicy: Forbid       # Skip if previous Job still running
  startingDeadlineSeconds: 600    # Fail if not started within 10 min of schedule
  successfulJobsHistoryLimit: 3   # Keep last 3 successful Job logs
  failedJobsHistoryLimit: 1       # Keep last 1 failed Job log
```

Also consider `suspend: true` during incident response to stop runaway batch workloads with one flag.

## 7. `kubectl debug` with Ephemeral Containers Beats SSH

`kubectl exec` fails whenever the container image lacks a shell. `kubectl debug` launches a short-lived helper container (with `busybox`, `distroless`, etc.) in the same pod namespace so you can inspect the filesystem and network without rebuilding images.

This command injects a busybox container into the running Pod, sharing the network and process namespace with the target container for debugging.

```bash
# Inject a debug container into the payments deployment
# --target joins the network/process namespace of the 'api' container
kubectl debug deploy/payments -it --image=busybox:1.36 --target=api
```

- `--target` picks which existing container’s namespaces you want to join.
- Ephemeral containers never restart with the pod, so there is no lingering risk.

## 8. `kubectl diff --server-side` Catches Drift Before You Apply

Git diffs only show what you changed locally. `kubectl diff --server-side -f manifest.yaml` compares your desired state with the **live** object, including defaulted fields and cluster-side mutations.

This command shows exactly what will change when you apply, helping catch unexpected drift before it happens.

```bash
# Compare local manifest with live cluster state
# --field-manager tracks who owns which fields for conflict resolution
kubectl diff --server-side -f k8s/deployment.yaml --field-manager=gitops
```

Pair it with `kubectl apply --server-side --field-manager=gitops` so a single manager owns each field, eliminating "field is managed by another client" errors during GitOps rollouts.

## 9. Policy-as-Code: Kyverno or Gatekeeper

Stop relying on wiki pages to enforce best practices. Admission controllers such as Kyverno or OPA Gatekeeper can reject any manifest missing labels, liveness probes, or resource limits.

This Kyverno policy rejects any Ingress that does not specify TLS configuration, ensuring all public endpoints use HTTPS:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-tls-ingress
spec:
  validationFailureAction: enforce  # Block non-compliant resources
  rules:
    - name: tls-required
      match:
        resources:
          kinds:
            - Ingress             # Apply to all Ingress resources
      validate:
        message: "Ingress must terminate TLS."
        pattern:
          spec:
            tls:
              - secretName: "?*"  # Require at least one TLS secret
```

Once the policy exists, developers get instant feedback at admission time instead of waiting for a code review.

## 10. Export Cluster Events and Metrics to OpenTelemetry

`kubectl get events` only holds a few hours of history. Ship events, kube-state-metrics, and node telemetry into OpenTelemetry Collector + OneUptime so regressions surface instantly.

- Deploy the Collector as a DaemonSet with the `kubeletstats` receiver.
- Add the `k8sobjects` receiver to stream Events, HPAs, and PDB changes.
- Forward everything to OneUptime (see [How to Monitor Kubernetes Clusters with OpenTelemetry and OneUptime](https://oneuptime.com/blog/post/2025-11-14-monitor-kubernetes-clusters-with-opentelemetry-and-oneuptime/view)) for SLOs and alerting.

This single pipeline gives developers the "why" behind pending pods, crash loops, or policy denials without ever SSH-ing into a node.

---

Kubernetes is already in your stack; squeezing more value from it is about turning on the features hiding behind a few YAML fields. Audit these ten areas during your next on-call retro and you will usually delete more incidents than you add new YAML.
