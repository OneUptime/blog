# Validation Summary: How to Configure Anti-Affinity Between Linux and Windows Pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes pod scheduling
- Node selectors and node affinity
- Pod affinity and pod anti-affinity
- Taints and tolerations
- Windows containers on Kubernetes
- kubectl

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes API reference: Pod v1, PodAffinityTerm and PodAntiAffinity - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Pods, Pod OS - https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes documentation: Windows containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes kubectl reference: kubectl taint - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/

## Issues Found
- The zone-based high availability example defined `podAntiAffinity` twice under the same `affinity` map. YAML mappings cannot safely contain duplicate keys, and Kubernetes would only receive one of those entries depending on parser behavior. I merged both preferred anti-affinity terms into the same `preferredDuringSchedulingIgnoredDuringExecution` list.
- The "Preventing Cross-OS Pod Interference" example implied Windows and Linux pods could normally share a node. In Kubernetes, a node has a single operating system, and mixed-OS clusters should use `kubernetes.io/os` node selectors for scheduling. I changed the wording and selector example to describe anti-affinity against specifically labeled dedicated workloads instead of generic Linux pods.

## Review Notes
The Kubernetes documentation recommends setting `.spec.os.name` to `windows` or `linux` to indicate pod OS intent, but it also states this field does not currently affect kube-scheduler placement. The post's use of `nodeSelector` and node affinity with `kubernetes.io/os` remains technically correct for scheduling in mixed-OS clusters.
