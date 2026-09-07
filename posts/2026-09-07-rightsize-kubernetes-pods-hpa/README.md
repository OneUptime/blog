# How to Rightsize Kubernetes Pods Without Breaking HPA Scaling Behavior

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Horizontal Pod Autoscaler, Autoscaling

Description: Change pod requests safely by accounting for the HPA utilization denominator, replica behavior, limits, and the node capacity needed during scale-out.

---

A Kubernetes CPU request is both a scheduling input and, for a utilization-based HorizontalPodAutoscaler, the denominator of the scaling signal. Lowering it can make the same workload appear busier and cause HPA to add replicas. The pod looks more efficient, but the cluster or cloud bill can rise.

Rightsizing an HPA workload therefore means tuning requests and autoscaling as one system.

## Understand the control equation

For resource utilization, HPA compares measured usage with the relevant request. For a `Resource` metric, Kubernetes uses total Pod usage and the Pod request for that resource. If the beta `PodLevelResources` feature supplies an explicit Pod-level request, that value is the denominator. Otherwise Kubernetes derives the request from the relevant containers. For a `ContainerResource` metric, the denominator remains the named container's request even when Pod-level resources are present.

In simplified form:

```text
utilization = current CPU usage / CPU request
desired replicas = ceil(current replicas * current metric / target metric)
```

Suppose each of four replicas uses 300 millicores:

```text
request 600m, target 60% -> observed utilization 50%
request 400m, target 60% -> observed utilization 75%
```

Nothing about application demand changed, but the second configuration asks HPA to scale out. If 400m is the correct scheduling request, preserve the intended control point by recalculating the target, using `AverageValue`, or switching to a business metric such as requests or queue depth.

Do not confuse a missing request with a missing metric sample. For utilization-based `Resource` scaling without a Pod-level request, an absent relevant request in a container leaves Pod utilization undefined and the autoscaler takes no action for that metric. A utilization-based `ContainerResource` metric similarly needs a request on its named container. By contrast, when a metric sample is temporarily missing, HPA sets that Pod aside and recomputes more conservatively. Complete requests and healthy metrics are separate requirements for reliable autoscaling.

## Inventory every scaling dependency

Before changing a request, record:

- HPA metric type, target, minimum, and maximum replicas;
- scale-up and scale-down behavior;
- metrics collection and application startup delay;
- pod and node provisioning time;
- readiness behavior and warmup;
- CPU throttling, memory OOMs, latency, errors, and queue age;
- topology spread, affinity, disruption budgets, and quotas;
- node allocatable capacity and autoscaler limits.

HPA creates pods, but it does not make nodes instantly available. A lower request may let more replicas fit on a node, while a higher replica count may trigger node provisioning. Test the entire chain.

## Separate request rightsizing from limit policy

The CPU request is a scheduling reservation and a share under contention. A CPU limit is an enforced ceiling that can throttle the container. Do not mechanically set a tight CPU limit equal to a newly lowered request unless predictable isolation requires it and load tests show that latency remains acceptable.

Memory needs more caution. A memory limit can lead to an OOM kill, while a request that is too low makes placement and node consolidation optimistic. Use working-set peaks, OOM history, and failover behavior rather than average memory.

Native sidecars and ordinary application containers also contribute to pod demand. Rightsize them individually so one noisy proxy does not distort the main container's HPA signal. Kubernetes supports a `ContainerResource` metric source when scaling should follow one named container rather than total Pod usage. If Pod-level resources are used, remember that this metric still requires and uses the named container's own request for a utilization target.

## Choose a metric that retains the intended behavior

This HPA uses absolute CPU per pod, so changing the CPU request does not change the target itself:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  minReplicas: 4
  maxReplicas: 30
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
  metrics:
  - type: ContainerResource
    containerResource:
      name: cpu
      container: application
      target:
        type: AverageValue
        averageValue: 350m
```

An absolute target is not automatically better. If the application is deployed to heterogeneous replicas or CPU efficiency changes with size, utilization may express the desired behavior more clearly. Document why the metric maps to capacity.

## Roll out request changes with a paired plan

1. Replay historical demand through both the old and proposed HPA equations.
2. Predict replica count, aggregate requested CPU and memory, and node count.
3. Test the proposed pod at steady load and at the expected spike.
4. Deploy a small canary with the new resources and identical code.
5. Compare per-request latency, errors, throttling, OOMs, and efficiency.
6. Increase traffic gradually while watching pending pods and node scale-out.
7. Keep the old manifest and rollback thresholds ready.

Avoid changing the request, HPA target, limits, and application version in one unexplained release. If they must ship together, label the experiment so attribution is still possible.

## Check aggregate capacity, not only pod utilization

Calculate the fleet effect at representative loads:

```text
aggregate requested CPU = desired replicas * CPU request per pod
aggregate requested memory = desired replicas * memory request per pod
```

A change from four pods at 600m to six pods at 400m leaves requested CPU at 2.4 cores, but sidecar requests, memory, pod slots, connections, and per-replica overhead all increase. It may also improve availability. Decide from service and cluster outcomes rather than assuming fewer millicores per pod means savings.

## Conclusion

Treat pod requests and HPA targets as coupled configuration. Model the denominator change, choose a metric aligned with demand, protect memory and startup behavior, and validate aggregate replicas and nodes. A safe rightsize preserves service objectives and autoscaling intent, not merely a lower request field.

## Official Documentation

- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [HorizontalPodAutoscaler v2 API](https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Assign Pod-level CPU and memory resources](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/)
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
