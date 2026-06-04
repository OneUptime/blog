# Validation Summary: How to Use Pod Topology Spread with maxSkew and whenUnsatisfiable Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Pod Topology Spread Constraints
- kubectl
- jq
- Prometheus / PrometheusRule
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference: Pod `TopologySpreadConstraint` fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes kubectl reference: `kubectl label` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes documentation: Metrics for Kubernetes Object States - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics documentation: Node metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics documentation: Pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post described `maxSkew` as the difference between any two domains. I clarified that, with `DoNotSchedule`, Kubernetes compares the target topology domain to the global minimum across eligible domains.
- The `DoNotSchedule` section incorrectly claimed that increasing from 4 to 5 replicas across 2 zones would leave one pod pending with `maxSkew: 1`. I corrected the example to show that a 3-to-2 distribution is valid and explained when a pod would actually remain pending.
- The common pitfall section incorrectly claimed that only even replica counts can run across 2 zones. I changed this to explain that odd counts are valid when the skew remains within 1.
- The monitoring shell script used a JSONPath expression built from a dotted label key variable, which would not correctly resolve `topology.kubernetes.io/zone`. I replaced it with a `jq` lookup using the label key as a map key.
- The Prometheus alert used labels that are not present directly on `kube_pod_info`. I changed it to join `kube_pod_info` with `kube_pod_labels` and `kube_node_labels`, and added a note that kube-state-metrics must expose those labels through its metric labels allowlist.
- The missing-labels pitfall said topology distribution fails if some nodes lack labels. I corrected this to state that nodes without the topology key are skipped for that topology spread calculation, which can reduce eligible domains or produce unexpected placement.

## Review Notes
The Kubernetes manifests use current `apps/v1` APIs and valid `topologySpreadConstraints` fields. The examples do not pin a Kubernetes version; the reviewed fields are current in the Kubernetes documentation as of 2026-06-04.
