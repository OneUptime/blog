# Validation Summary: How to Set Up Flux CD on a Multi-Node Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI bootstrap
- Kubernetes scheduling
- Kubernetes node affinity and pod anti-affinity
- Kubernetes taints and tolerations
- Kubernetes resource requests and limits
- Kubernetes topology spread constraints
- Kubernetes PriorityClass
- Kustomize patches

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux install CLI documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux FAQ / supported release policy: https://fluxcd.io/flux/faq/
- Flux latest generated install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes assigning pods to nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes pod priority and preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/

## Issues Found
- The prerequisite listed Kubernetes `v1.20+`, which is not accurate for current Flux support. Updated it to require a Kubernetes version supported by the Flux release in use.
- The post described the default single-replica Flux controllers as highly available and said scheduling rules would ensure distribution. Updated the wording to describe resilience and scheduler preferences more accurately, because the examples use preferred anti-affinity and `ScheduleAnyway` topology spread constraints.
- The topology spread constraint selected only `app: source-controller`, which counts only source-controller pods and does not distribute the Flux controller set as described. Updated the selector to `app.kubernetes.io/part-of: flux`, which matches the labels present on Flux controller pods.

## Review Notes
- The Flux CLI was not installed in the local environment, so CLI verification was performed against official Flux command documentation instead of local `--help` output.
- `kubectl` was not installed in the local environment, so Kubernetes field verification was performed against official Kubernetes documentation instead of local `kubectl explain` output.
- The Kustomize patch structure, controller deployment names, `manager` container name, Flux pod labels, node affinity fields, toleration fields, resource fields, topology spread fields, and PriorityClass API version were consistent with the consulted documentation and generated Flux manifests.
