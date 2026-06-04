# Validation Summary: How to Set Pod QoS Classes to Guaranteed, Burstable, and BestEffort

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- Kubernetes node-pressure eviction
- kubectl
- PrometheusRule and kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes documentation: Configure Quality of Service for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/
- Kubernetes documentation: Node-pressure Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl reference: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The Guaranteed QoS section claimed the pod would never be evicted due to resource pressure unless all pods were Guaranteed and it exceeded limits. Updated this to match Kubernetes documentation: Guaranteed pods are least likely to be evicted and are protected until they exceed limits or no lower-priority pods can be evicted.
- The eviction order section described kubelet eviction as a strict QoS-class phase order. Updated it to mention the documented ranking inputs: whether usage exceeds requests, Pod Priority, and usage relative to requests.
- The example eviction comments used absolute "will be evicted" language. Changed them to "likely" language because Priority and current resource usage also affect eviction ranking.
- The PrometheusRule example used `qos_class!="guaranteed"`, but kube-state-metrics exposes QoS labels as `BestEffort`, `Burstable`, and `Guaranteed`. Updated the label value casing and matched the active series with `== 1`.
- The testing section used unsupported `kubectl run --requests` and `kubectl run --limits` flags. Replaced those commands with a `kubectl apply -f -` manifest that creates BestEffort, Burstable, and Guaranteed test pods.
- The testing section said BestEffort pods would always be evicted first, followed by Burstable. Updated this to account for Pod Priority and resource usage.

## Review Notes
The post remains accurate as a general Kubernetes QoS guide. Kubernetes v1.34 and newer also support beta Pod-level resource specifications for CPU and memory, but the post's container-level examples remain current and valid.
