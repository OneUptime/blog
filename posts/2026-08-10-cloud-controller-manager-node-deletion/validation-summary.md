# Validation Summary: Can cloud-controller-manager Delete a Kubernetes Node?

## Status

validated

## Post Type

Troubleshooting guide and technical reference

## Technologies Covered

- Kubernetes 1.36
- Kubernetes cloud-provider v0.36.0
- cloud-controller-manager
- kube-controller-manager node lifecycle controller
- Cloud node lifecycle controller
- Taint eviction controller
- Kubernetes Nodes, Events, Leases, taints, and RBAC
- Go `InstancesV2` and `Instances` cloud-provider interfaces
- kubectl

## Sources Consulted

- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Nodes and the node controller](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes: Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes: Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [Kubernetes: Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes: Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes cloud-provider v0.36.0: cloud node lifecycle controller](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/nodelifecycle/node_lifecycle_controller.go)
- [Kubernetes cloud-provider v0.36.0: lifecycle controller tests](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/controllers/nodelifecycle/node_lifecycle_controller_test.go)
- [Kubernetes cloud-provider v0.36.0: provider interfaces](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/cloud.go)
- [Kubernetes cloud-provider v0.36.0: shared configuration defaults](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/config/v1alpha1/defaults.go)
- [Kubernetes cloud-provider v0.36.0: well-known taints](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/api/well_known_taints.go)
- [Kubernetes cloud-provider v0.36.0: lifecycle controller startup](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/core.go)
- [Kubernetes cloud-provider v0.36.0: controller-manager leader-election path](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/app/controllermanager.go)
- [Kubernetes cloud-provider v0.36.0: leader-election defaults](https://github.com/kubernetes/cloud-provider/blob/v0.36.0/options/options.go)
- [Kubernetes v1.36.0: node lifecycle controller source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/controller/nodelifecycle/node_lifecycle_controller.go)
- [Kubernetes v1.36.0: taint eviction controller source](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/controller/tainteviction/taint_eviction.go)

## Issues Found

- The introduction stated that the CCM observes the instance as actually gone, even though it can only act on the provider integration's result and a false negative is possible. Changed the wording to say that the provider reports the instance gone.
- The decision diagram and conclusion said provider errors never count as absence. On the legacy `Instances` path, an exact `cloudprovider.InstanceNotFound` returned while deriving a missing provider ID is deliberately converted into an absence result. Distinguished that authoritative sentinel from connectivity, authorization, throttling, and other operational errors, which leave the Node unchanged.
- The health explanation conflated stale heartbeats with `Ready=False` and attributed taint-based Pod eviction to the node lifecycle controller. Clarified that stale Node status and Lease heartbeats can produce `Ready=Unknown` and the unreachable taint, that reported `Ready=False` maps to the not-ready taint, and that Kubernetes 1.29 and later use the separate `taint-eviction-controller` for taint-based Pod eviction.
- The health and cloud lifecycle controllers were not explicitly distinguished. Clarified that kube-controller-manager's `node-lifecycle-controller` handles cloud-independent health, while the provider CCM's `cloud-node-lifecycle-controller` performs provider-backed existence and shutdown checks.
- The provider-interface section implied that external providers normally use `InstancesV2` and that only older providers use `Instances`. Upstream does not mark `Instances` as deprecated, and current external providers may use either interface. Changed the wording to describe both as supported alternatives.
- The provider-ID fallback was stated as universal. During v0.36.0 lifecycle checks, only the legacy `Instances` path derives an ID from the Node name; `InstancesV2` receives the complete Node and owns its fallback lookup semantics. Corrected the explanation and the troubleshooting lookup-key check.
- The deletion and shutdown descriptions named only the `InstancesV2` methods and did not state that a true shutdown result must have no accompanying error. Added the legacy method names and the nil-error requirement.
- The shutdown `NoSchedule` taint was described as preventing all new scheduling. Corrected this to apply to Pods that do not tolerate the taint.
- The troubleshooting checklist omitted an absent `Ready` condition, even though v0.36.0 defaults it to `Unknown` for this loop. Added the absent-condition case and clarified that only `Ready=True` skips the existence check.
- Leader Lease ownership was presented as an unconditional prerequisite, although the CCM can run with leader election disabled. Made Lease ownership conditional, and changed the high-availability recommendation to account for the brief interruption possible during leader failover.
- Provider-ID population was presented as a universal cloud-initialization signal. Qualified the recommendation for providers that support provider IDs.

## Review Notes

The review was pinned to Kubernetes cloud-provider v0.36.0 and Kubernetes 1.36 behavior. The upstream `go test ./controllers/nodelifecycle` test suite passed, all seven links originally included in the post returned HTTP 200, and the kubectl commands, JSONPath expressions, field selectors, and flags are valid. The relevant lifecycle, interface, startup, taint, and default-period files have no changes between the v0.36.0 and v0.36.3 tags.

The `kubectl logs` example assumes a single-container CCM Pod or a default-container annotation; otherwise, add `-c <container-name>`. Kubernetes Events are best-effort and retained for a limited time. If Node names can be reused, add `involvedObject.uid=<node-uid>` to the Event field selector when the UID is known so events from different Node generations are not conflated. Provider-specific lookup rules, labels, controller selection, log messages, credentials, and Lease configuration still need to be checked against the provider distribution.
