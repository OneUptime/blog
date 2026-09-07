# How to Rightsize Guaranteed QoS Pods Without Losing Their Kubernetes QoS Class

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Capacity Planning, Performance

Description: Reduce Guaranteed pod resources while preserving the required CPU and memory equality at either container or pod level.

---

Kubernetes assigns a pod to the Guaranteed QoS class only when its CPU and memory configuration meets strict criteria. A well-intended edit to one request can make replacement pods Burstable. Kubernetes fixes a pod's QoS class at creation and rejects an in-place resize that would change it.

For the traditional container-level model, every app and init container must have positive CPU and memory requests and limits, and each request must equal its corresponding limit. Inspect the actual pod after admission because LimitRanges, mutating webhooks, and sidecar injection can change the result.

## Confirm the invariant

This container satisfies the container-level requirement:

```yaml
resources:
  requests:
    cpu: "500m"
    memory: 768Mi
  limits:
    cpu: "500m"
    memory: 768Mi
```

This edit does not:

```yaml
resources:
  requests:
    cpu: "350m"
    memory: 768Mi
  limits:
    cpu: "500m"
    memory: 768Mi
```

One unequal CPU pair makes the pod ineligible for Guaranteed QoS. A newly injected proxy without complete equal pairs has the same effect.

Check the server-side object and status:

```bash
kubectl -n payments get pod checkout-abcde -o jsonpath='{.status.qosClass}{"\n"}'
kubectl -n payments get pod checkout-abcde -o yaml
```

Do this in a staging namespace that has the same admission policies as production.

## Account for Pod-level resources in Kubernetes 1.37

Kubernetes 1.37 also supports Pod-level CPU and memory resources through the beta `PodLevelResources` feature, which is enabled by default. When a pod uses these fields, Pod-level resources take precedence for QoS classification. A pod is Guaranteed when its positive Pod-level CPU request equals its CPU limit and its positive Pod-level memory request equals its memory limit. Containers can then share the overall budget without every container declaring all four values.

This fragment uses the Pod-level path:

```yaml
spec:
  resources:
    requests:
      cpu: "2"
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 2Gi
  containers:
  - name: application
    image: registry.k8s.io/pause:3.10.1
  - name: telemetry
    image: registry.k8s.io/pause:3.10.1
```

The Pod-level CPU limit and memory limit are collective boundaries for the containers. Verify that the cluster and all nodes support the feature, and check the admitted pod rather than assuming that a manifest was interpreted as intended. Kubernetes 1.37 does not support Pod-level resources for Windows pods.

Do not confuse `PodLevelResources` with `PodLevelResourceManagers`. The latter is a separate beta feature in Kubernetes 1.37 and is disabled by default. CPU Manager, Memory Manager, and Topology Manager only use Pod-level budgets for exclusive or NUMA-aligned allocation when that separate feature is enabled and configured. Without it, a Pod can still be Guaranteed through Pod-level equality, but the node resource managers do not allocate from that Pod-level budget.

## Decide whether Guaranteed is still the requirement

Guaranteed pods are considered after BestEffort and Burstable pods during node-pressure eviction ordering, subject to actual usage relative to requests and other conditions. They also cannot burst beyond their configured CPU and memory limits. Preserving the label is not automatically more important than service performance.

Document why it is required:

- predictable isolation for a latency-sensitive workload;
- compatibility with static CPU Manager policy and integer CPU allocation;
- a platform tenancy rule;
- reduced eviction risk under node pressure;
- a certified performance configuration.

If the workload benefits from idle CPU and does not need a hard CPU ceiling, a carefully managed Burstable policy may be more appropriate. Make that a separate architecture decision, not an accidental side effect of rightsizing.

## Measure every container separately

Collect CPU, memory working set, throttling, OOM, and startup peaks for application containers, ordinary sidecars, and init containers. Do not allocate every container from the pod average. A service-mesh proxy may need CPU based on request rate while the application needs memory based on active sessions.

For a regular init container that finishes before the application starts, its peak can affect the pod's effective scheduling requirement even though it does not run in steady state. It still needs complete equal CPU and memory pairs to retain container-level Guaranteed QoS.

## Change all four values atomically

Generate or review each container as a tuple:

```text
(cpu request, cpu limit, memory request, memory limit)
```

For Guaranteed, the first pair and second pair must be equal. Change the request and matching limit in one version-controlled patch. Avoid a deployment pipeline that updates requests and limits in separate steps.

Example strategic merge fragment:

```yaml
spec:
  template:
    spec:
      containers:
      - name: application
        resources:
          requests:
            cpu: "750m"
            memory: 1Gi
          limits:
            cpu: "750m"
            memory: 1Gi
      - name: telemetry
        resources:
          requests:
            cpu: "100m"
            memory: 128Mi
          limits:
            cpu: "100m"
            memory: 128Mi
```

Review injected containers on the rendered pod, not only the deployment template.

## Respect hard-limit behavior

With equal pairs, a lower CPU request also lowers the hard CPU limit. Load-test tail latency and throttling at the proposed ceiling. A lower memory request also lowers the OOM boundary, so use peak working set plus native memory, cache, diagnostics, and failure recovery needs.

With the traditional container-level model and the kubelet static CPU management policy, an eligible Guaranteed container with an integer CPU request can receive exclusive CPUs. Reducing from two CPUs to 1500m changes that placement property even though QoS remains Guaranteed. For a Pod-level budget on Kubernetes 1.37, review the separate `PodLevelResourceManagers` gate and its allocation rules before assuming equivalent exclusivity.

## Roll out and verify

Canary the complete pod shape and gate on:

- `.status.qosClass` remains `Guaranteed`;
- no new throttling or OOM events;
- latency and throughput meet objectives;
- init and warmup complete within deadlines;
- pods remain schedulable across required zones;
- node-pressure and failover tests behave as designed.

Policy can prevent accidental drift. Admission checks can require equal nonzero CPU and memory pairs in namespaces where Guaranteed is mandatory, but test policy changes carefully so a webhook or controller outage does not block unrelated deployments.

## Conclusion

Preserve Guaranteed QoS through either complete equal container pairs or equal Pod-level CPU and memory pairs. Verify the admitted pod, test the new hard ceilings, and check whether node resource-manager features support the chosen model. First confirm that Guaranteed remains an intentional requirement rather than a label preserved by habit.

## Official Documentation

- [Kubernetes Pod QoS classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Configure Pod Quality of Service](https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/)
- [Kubernetes CPU management policies](https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/)
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Assign Pod-level CPU and memory resources](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/)
- [Kubernetes Pod-level resource managers](https://kubernetes.io/docs/concepts/resource-management/pod-level-resource-managers/)
