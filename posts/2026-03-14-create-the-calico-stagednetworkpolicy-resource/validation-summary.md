# Validation Summary: Creating the Calico StagedNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico StagedNetworkPolicy
- Kubernetes custom resources
- kubectl
- YAML manifests

## Sources Consulted
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico staged policy overview: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- Removed the invalid `spec.stagedAction` field from the example manifest. The official `StagedNetworkPolicy` spec does not define `stagedAction`; staging behavior is implied by the resource kind, and rule-level `action` values are used instead.
- Replaced the `stagedAction` explanation with rule `action` guidance and clarified that `StagedNetworkPolicy` previews policy behavior without enforcing traffic changes.
- Removed `calicoctl` apply/get guidance for this resource. The current Calico Open Source `calicoctl` reference does not list staged policy resources among supported `calicoctl` aliases, while the `StagedNetworkPolicy` resource reference documents `kubectl` aliases and supported operations.
- Added a prerequisite that the `projectcalico.org/v3` API must be available through the Calico API server or native v3 CRDs, because `kubectl` access depends on that API being served.
- Corrected verification commands to include the `production` namespace and the specific `staged-restrict-db` resource name.
- Replaced the `calicoctl` validation recommendation with `kubectl apply --dry-run=server`, which validates through the Kubernetes API server without creating the resource.
- Replaced the node-label example with pod-label commands, because the policy selectors in the manifest match workload labels in the namespace, not node labels.
- Updated the conclusion to recommend server-side dry-run validation instead of `calicoctl` validation.

## Review Notes
The remaining commands and manifest fields align with the current Calico Open Source resource reference. The post assumes the Calico components run in `calico-system`; some installations may use a different namespace, so operators should adjust log and pod-inspection commands for their deployment.
