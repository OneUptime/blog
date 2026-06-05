# Validation Summary: How to Troubleshoot Node Affinity Rules Preventing Collector DaemonSet from

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes DaemonSets
- Kubernetes node affinity and node selectors
- Kubernetes taints and tolerations
- Kubernetes pod priority and eviction
- kubectl
- OpenTelemetry Collector

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes assigning Pods to nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Toleration API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/#scheduling
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/

## Issues Found
- The post repeatedly said the Collector would run on "every node" after removing a single constraint. Kubernetes DaemonSets schedule onto eligible nodes, and scheduling can still be blocked by node selectors, affinity, taints, resource availability, and other pod scheduling rules. Updated the affected wording to "eligible node" or to describe the specific constraint being removed.
- The example scheduler event said nodes "matched pod affinity/anti-affinity rules", which does not describe a failure. Updated it to the common failure reason that nodes "didn't match Pod's node affinity/selector".
- The pod coverage command included the header row from `kubectl get pods -o wide`, so `awk '{print $7}'` would include `NODE` in the output. Added `--no-headers` to make the comparison accurate.
- The `system-node-critical` guidance implied that it prevents eviction and is broadly appropriate for monitoring. Kubernetes priority affects scheduling and eviction ordering, but system-level priority should be reserved for genuinely critical pods. Updated the wording to make this conditional and less absolute.

## Review Notes
The configuration snippets use current Kubernetes API fields for DaemonSets, tolerations, node affinity, node selectors, resources, and `priorityClassName`. The `otel/opentelemetry-collector-contrib:latest` image reference is syntactically valid, but pinning an explicit image version would be preferable for repeatable production deployments.
