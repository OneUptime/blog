# How to Run VPA Safely for StatefulSets and Databases Without Surprise Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, StatefulSet, Databases, High Availability

Description: Introduce VPA to StatefulSets and databases with observation, bounded per-container policy, quorum-aware disruption controls, controlled rollout, and explicit fallback decisions.

---

VPA supports StatefulSets, but Stateful identity and persistent storage do not make resource changes disruption-free. In `Recreate`, VPA evicts a Pod and StatefulSet recreates its stable identity; the database process still stops, recovers, rejoins, and may affect quorum or replication lag. Build application safety before allowing automatic action.

## Start with Recommendation-Only Mode

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: postgres
  namespace: databases
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgres
  updatePolicy:
    updateMode: Off
  resourcePolicy:
    containerPolicies:
      - containerName: postgres
        controlledResources: [cpu, memory]
        controlledValues: RequestsOnly
        minAllowed:
          cpu: "1"
          memory: 4Gi
        maxAllowed:
          cpu: "8"
          memory: 32Gi
      - containerName: metrics
        mode: Off
```

Observe through normal peaks, backups, compaction, failover, cache warm-up, and maintenance. Database memory working set often reflects page cache and configured buffers; a lower statistical target is not automatically a safe database setting. Reconcile VPA output with engine-specific memory configuration and OOM history.

`RequestsOnly` prevents VPA from moving a deliberate memory limit. If the Pod is designed as `Guaranteed`, however, a request-only in-place change would alter QoS and cannot be applied in place. Choose the initial QoS and control mode intentionally.

## Establish Quorum and Disruption Safety

For a three-member quorum where two members must remain healthy:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres
  namespace: databases
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: postgres
```

Also consider a per-VPA replica floor:

```yaml
spec:
  updatePolicy:
    updateMode: Recreate
    minReplicas: 3
```

`minReplicas` only decides whether VPA considers the replica group large enough. The PDB controls Eviction API admission. Neither understands database leader roles, synchronous replication, lag, shard placement, or recovery state. Readiness must accurately represent whether a member is safe to count, and the operator or application should refuse unsafe failover separately.

```bash
kubectl -n databases get pdb postgres -o yaml
kubectl -n databases get pods -l app=postgres -w
kubectl -n databases get events --sort-by=.lastTimestamp | tail -n 50
```

## Choose an Update Strategy Deliberately

Three useful patterns have different risk:

### Controlled Manual Rollout

Keep VPA `Off`, review its target, patch the StatefulSet template through Git, and execute the database's documented rolling maintenance procedure. This is the most predictable option for critical stores and creates a durable template change.

### Creation-Time Mutation

Use `Initial` so a Pod receives the recommendation only when it is created for another approved reason. This avoids autonomous updater eviction, but the next recovery or node drain can start a Pod with changed resources. Test admission and schedulability before relying on it.

### Automatic Lifetime Update

Use `Recreate` only when an eviction at any time is acceptable. VPA has no built-in maintenance-window schedule. `InPlaceOrRecreate` attempts a resize first but can evict after infeasible or stalled work, so it still permits surprise downtime. VPA 1.7 alpha `InPlace` never evicts, but it requires `--feature-gates=InPlace=true` on both the admission controller and updater, and a resize can remain deferred indefinitely.

For any automatic mode, cap recommendations below the largest eligible node after DaemonSet and sidecar overhead. VPA can otherwise evict a healthy member and create a replacement that cannot schedule.

## Test Stateful Recovery, Not Just Pod Readiness

In a staging topology that matches production:

1. take and verify a backup;
2. resize or recreate one non-leader member;
3. measure termination, attach, startup, recovery, catch-up, and readiness time;
4. prove no second member is disrupted during the full recovery interval;
5. repeat with the leader using the supported switchover procedure; and
6. test a failed replacement, full node, unavailable volume zone, and webhook rejection.

A PDB governs voluntary eviction admission and accounts for disruptions, but it does not guarantee that a replacement becomes Ready. Upstream VPA explicitly warns that it cannot guarantee successful recreation after eviction.

## Monitor the Database and the Autoscaler Together

Alert on:

- VPA target, bounds, and `uncappedTarget` approaching policy caps;
- `EvictedByVPA` and `InPlaceResizedByVPA` events;
- Pending replacements and `FailedScheduling`;
- replica lag, quorum membership, leader changes, and recovery duration;
- container restart count and OOMKills; and
- PDB `disruptionsAllowed` and current healthy members.

Do not lower memory automatically while the engine's current working set exceeds the proposed limit. Kubernetes 1.35+ no-restart memory limit decreases are best effort, not an application consistency mechanism.

## Official Documentation

- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [VPA API policies and update modes](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA in-place fallback behavior](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#in-place-updates-inplaceorrecreate)
- [VPA admission validation for the InPlace gate](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)
- [Kubernetes 1.35 in-place Pod resize GA changes](https://kubernetes.io/blog/2025/12/19/kubernetes-v1-35-in-place-pod-resize-ga/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes Pod disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

## Conclusion

For stateful workloads, VPA is a sizing signal before it is an actuator. Begin in `Off`, constrain each container, align recommendations with database configuration, and prove quorum-aware recovery. Prefer a controlled StatefulSet rollout for critical stores; if automation is enabled, assume every fallback eviction can happen outside a maintenance window and engineer accordingly.
