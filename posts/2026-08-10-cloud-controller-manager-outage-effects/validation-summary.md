# Validation Summary: What Happens When cloud-controller-manager Goes Down?

## Status
validated

## Post Type
Technical troubleshooting guide and operational reference

## Technologies Covered

- Kubernetes 1.36
- External `cloud-controller-manager` and `k8s.io/cloud-provider` v0.36.0
- Kubernetes Nodes, taints, conditions, and node lifecycle controllers
- Cloud route reconciliation and Pod CIDRs
- `LoadBalancer` Services and EndpointSlices
- Kubernetes Lease-based leader election
- `kubectl`

## Sources Consulted

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Nodes and the node controller](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/)
- [Kubernetes: Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/node-v1/)
- [Kubernetes: Service and `loadBalancerClass`](https://kubernetes.io/docs/concepts/services-networking/service/#specifying-class-of-load-balancer-implementation)
- [Kubernetes: Creating an External Load Balancer and cleanup finalizers](https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#garbage-collecting-load-balancers)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: kubectl Quick Reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: `kubectl events`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes v1.36.0 kubelet Node registration source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/kubelet/kubelet_node_status.go)
- [Kubernetes cloud-provider v0.36.0 interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)
- [Kubernetes cloud-provider v0.36.0 controller startup source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)
- [Kubernetes cloud-provider v0.36.0 cloud node controller source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/node/node_controller.go)
- [Kubernetes cloud-provider v0.36.0 cloud node lifecycle source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/nodelifecycle/node_lifecycle_controller.go)
- [Kubernetes cloud-provider v0.36.0 route controller source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/route/route_controller.go)
- [Kubernetes cloud-provider v0.36.0 Service controller source](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/service/controller.go)
- [Kubernetes cloud-provider v0.36.0 options and leader-election defaults](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/options/options.go)
- [Kubernetes cloud-provider v0.36.0 controller-manager leader-election flow](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/controllermanager.go)
- [Kubernetes cloud-provider v0.36.0 to v0.36.3 comparison](https://github.com/kubernetes/cloud-provider/compare/v0.36.0...v0.36.3)

## Issues Found

- The initialization taint example omitted the value that the kubelet sets. Changed it from `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` to `node.cloudprovider.kubernetes.io/uninitialized=true:NoSchedule` to match Kubernetes v1.36.0 source.
- The node initialization description implied that all provider fields, including addresses, are populated before the initialization taint is removed. Clarified that available provider ID and topology metadata are applied with the initialization update, while cloud-reported `.status.addresses` are updated separately afterward and all fields depend on provider support. Updated the recovery check accordingly.
- The route description said the v0.36.0 controller reads either `.spec.podCIDR` or `.spec.podCIDRs`. Corrected it to `.spec.podCIDRs`, which is the field the controller actually iterates, including for dual-stack Nodes.
- The route section treated a Node-address change as a generic route update. Clarified that address-aware reconciliation is provider opt-in and that the shared controller implements such a change by deleting and recreating the route. Also narrowed cleanup wording to provider-returned managed routes and clarified that `NetworkUnavailable` can remain stale during the outage.
- The load-balancer section referred broadly to traffic policies and source ranges. Replaced those terms with the exact fields `.spec.externalTrafficPolicy` and `.spec.loadBalancerSourceRanges`, which the v0.36.0 shared Service controller watches for load-balancer reconciliation.

## Review Notes

- All `kubectl` commands and JSONPath/custom-column expressions are syntactically valid. The Pod label and Lease name used to inspect CCM high availability are deployment-specific, and the post correctly tells readers to adjust them for their provider.
- `kubectl get events --sort-by=.lastTimestamp` remains valid for core/v1 Events. For EventSeries-aware ordering, `kubectl events -n kube-system` is a more robust modern alternative.
- All external links resolve to the intended official documentation or source files. The post pins v0.36.0 source; v0.36.3 is the current patch release, and the three pinned source files cited in the post are unchanged between those tags.
- The post appropriately qualifies provider-resource continuity with “usually” and calls out alternate CNI, route, and load-balancer controller ownership.
