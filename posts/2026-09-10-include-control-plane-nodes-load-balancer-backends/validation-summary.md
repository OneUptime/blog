# Validation Summary: How to Include Control-Plane Nodes in Cloud Load Balancer Backends

## Status

validated

## Post Type

Kubernetes backend eligibility troubleshooting guide

## Technologies Covered

- Kubernetes cloud-provider service controller v0.33.0 and v0.34.0
- Kubernetes labels, taints, tolerations, EndpointSlices and traffic policies
- OCCM v1.36.0 and HCCM v1.36.0 backend selectors

## Sources Consulted

- [Kubernetes external-load-balancer exclusion label](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-kubernetes-io-exclude-from-external-load-balancers)
- [Kubernetes v0.33.0 cloud-provider service controller](https://github.com/kubernetes/cloud-provider/blob/v0.33.0/controllers/service/controller.go)
- [Kubernetes v0.34.0 cloud-provider service controller](https://github.com/kubernetes/cloud-provider/blob/v0.34.0/controllers/service/controller.go)
- [OCCM v1.36.0 node selection and single-node note](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
- [HCCM v1.36.0 node-selector reference](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes Service external traffic policy](https://kubernetes.io/docs/concepts/services-networking/service/#external-traffic-policy)
- [kubectl label removal syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- Compared the tagged cloud-provider code: v0.33.0 excludes by label presence; v0.34.0 parses a Boolean value and rejects malformed values. Removing the key is therefore correctly presented as the portable inclusion operation.
- Checked readiness and deletion-related predicates and the node update trigger. ProviderID and exclusion-predicate changes are special triggers; arbitrary custom label edits are not guaranteed to refresh membership immediately, supporting the focused Service-annotation reconciliation advice.
- Verified that OCCM and HCCM expose differently implemented node selectors. The sample control-plane toleration matches the stated NoSchedule taint, and nodeSelector narrows scheduling independently of load balancer eligibility.
- Checked EndpointSlice label selection, Service inspection, label deletion, and Local versus Cluster traffic semantics. The resource/routing inspection and externally originated traffic check are correctly required beyond mere backend membership.
- Reviewed on 2026-09-10. All 5 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
