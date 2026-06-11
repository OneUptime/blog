# Validation Summary: How to Create Kubernetes RuntimeClass

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RuntimeClass
- Kubernetes Pod overhead
- containerd runtime handlers
- CRI-O runtime handlers
- gVisor
- Kata Containers
- crictl
- Kyverno
- OPA Gatekeeper

## Sources Consulted
- Kubernetes RuntimeClass concept documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes Pod Overhead documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- containerd CRI configuration documentation: https://containerd.io/docs/2.1/cri/config/
- gVisor containerd quick start: https://gvisor.dev/docs/user_guide/containerd/quick_start/
- Kata Containers containerd integration documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/containerd-kata.md
- CRI-O configuration manual: https://github.com/cri-o/cri-o/blob/main/docs/crio.conf.5.md
- cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The overhead verification command queried `.status.containerStatuses[0].resources`, which does not show the RuntimeClass overhead added at admission. Changed it to query `.spec.overhead`, matching the Kubernetes Pod Overhead documentation.
- The CRI-O Kata runtime snippet used `runtime_type = "oci"` for a VM-based runtime. Changed the Kata handler to `runtime_type = "vm"`, matching CRI-O's runtime type options for OCI and VM runtimes.
- The Kyverno policy used top-level `spec.validationFailureAction`, which is deprecated in current Kyverno documentation. Moved enforcement to `validate.failureAction: Enforce`.
- The `crictl` runtime-handler test used `crictl run --runtime=runsc` with container and pod config files. The documented runtime handler test uses `crictl runp --runtime=runsc` to create a pod sandbox with that runtime handler. Updated the comment and command accordingly.

## Review Notes
The RuntimeClass API examples use stable `node.k8s.io/v1` fields. The containerd examples use `version = 2`, which remains supported, but current containerd 2.x documentation recommends `version = 3` with updated plugin paths for new deployments.
