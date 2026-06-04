# Validation Summary: How to Use Goldilocks for VPA Recommendations Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Fairwinds Goldilocks
- Kubernetes Vertical Pod Autoscaler (VPA)
- Helm
- kubectl
- Kubernetes Ingress and NetworkPolicy
- kube-state-metrics / Prometheus

## Sources Consulted
- Goldilocks documentation: https://goldilocks.docs.fairwinds.com/
- Goldilocks installation documentation: https://goldilocks.docs.fairwinds.com/installation/
- Goldilocks advanced usage documentation: https://goldilocks.docs.fairwinds.com/advanced/
- Goldilocks FAQ: https://goldilocks.docs.fairwinds.com/faq/
- Fairwinds Goldilocks source code: https://github.com/FairwindsOps/goldilocks
- Kubernetes VPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA API/types and flags: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- kube-state-metrics custom resource metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespace labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-metadata-name

## Issues Found
- Goldilocks-managed VPA names were described and used as `<workload>-goldilocks-vpa`; current Goldilocks creates names as `goldilocks-<workload>`. Updated the description and all `kubectl get/describe vpa` examples.
- The dashboard recommendation types were described as Guaranteed, Burstable, and Unconstrained. Goldilocks documents and renders Guaranteed and Burstable QoS recommendations. Removed the unsupported Unconstrained dashboard recommendation.
- The dashboard filtering/sorting claims overstated current functionality. Updated the section to namespace filtering, workload grouping, and using dashboard cost comparison or `goldilocks summary` for optimization analysis.
- Goldilocks update mode configuration was shown as a namespace annotation. Official Goldilocks docs use labels for namespace update mode, while annotations are also read in code for resources. Updated the namespace example to use labels.
- The post recommended `auto` as the automatic VPA mode. Upstream VPA now deprecates `Auto`; updated the recommendation to `recreate` for eviction-based automatic updates.
- Resource boundaries were shown as unsupported `cpu-min`, `cpu-max`, `memory-min`, and `memory-max` annotations. Replaced them with the documented `goldilocks.fairwinds.com/vpa-resource-policy` JSON annotation using VPA `minAllowed` and `maxAllowed`.
- The workload exclusion example used `goldilocks.fairwinds.com/enabled=false` on a Deployment, which only manages namespace enablement. Replaced it with the documented `goldilocks.fairwinds.com/exclude-containers` label and adjusted the section to container exclusion.
- The GitOps `kubectl patch` example used single quotes inside JSON, which is invalid JSON. Rewrote the patch payload with escaped double quotes and quoted shell variables.
- The PromQL example used deprecated `kube_pod_container_resource_requests_cpu_cores` and a non-standard VPA metric name. Replaced them with `kube_pod_container_resource_requests{resource="cpu",unit="core"}` and the documented kube-state-metrics custom resource VPA metric.
- The advanced VPA recommender configuration used a ConfigMap with underscored keys. Replaced it with deployment args matching the official VPA recommender flags.
- The troubleshooting command attempted to `curl` from the dashboard container, which may not include curl and does not directly test RBAC. Replaced it with `kubectl auth can-i` for the dashboard service account.
- The NetworkPolicy namespace selector used a non-default `name` label. Replaced it with Kubernetes' default `kubernetes.io/metadata.name` namespace label.
- The stabilization note said VPAs need at least 24 hours. Goldilocks FAQ notes recommendations can appear after a few minutes, while VPA's default historical model uses an 8-day window for maximum boundary accuracy. Updated the statement accordingly.

## Review Notes
Goldilocks and VPA behavior depends on the VPA components installed. The Goldilocks chart installs only the VPA recommender by default when using its VPA subchart, so automatic update modes require the appropriate VPA updater and admission webhook components to be installed and intentionally configured.
