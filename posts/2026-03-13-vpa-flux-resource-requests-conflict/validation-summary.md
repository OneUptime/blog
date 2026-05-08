# Validation Summary: VPA and Flux CD Resource Requests Conflict

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Flux CD kustomize-controller
- Kustomize
- GitOps resource management

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The introduction incorrectly stated that Flux normally detects VPA-mutated Pod resource requests from Deployment workloads as drift and overwrites them. Updated the explanation to clarify that VPA generally mutates Pods at admission time while Flux manages the controller object, and that conflicts require overlapping field ownership.
- The original Flux annotation example used `kustomize.toolkit.fluxcd.io/force: "disabled"` as if it ignored resource fields. Flux documents this annotation as a recreate policy, not a field ignore policy. Replaced it with `kustomize.toolkit.fluxcd.io/ssa: "Merge"` and omitted request fields from the manifest.
- The original example used `kubectl.kubernetes.io/last-applied-configuration` as if it told Flux not to reset VPA-managed resources. Removed it because it is not a Flux ignore mechanism.
- The original Flux `Kustomization` custom resource included a `patches` section to remove request fields. That patch belongs in a source `kustomization.yaml`, not in the Flux `Kustomization` CRD. Replaced the snippet with a Kustomize overlay example.
- The original Kustomize/local-config example claimed `config.kubernetes.io/local-config: "true"` makes Flux ignore specific fields. That annotation is not a Flux field-ignore mechanism. Replaced the section with VPA `Off` mode for recommendation-only GitOps workflows.
- The best-practices section referenced VPA `Auto` mode without noting its current deprecation. Updated it to recommend `Recreate`, `InPlaceOrRecreate`, `Initial`, or `Off` according to the desired behavior.

## Review Notes
The `flux` and `kubectl` binaries were not installed in the local workspace, so CLI command validation was performed against official documentation rather than local `--help` output. The remaining examples are version-sensitive around VPA `InPlaceOrRecreate`, which requires cluster support for in-place Pod resizing.
