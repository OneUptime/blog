# Validation Summary: How to Update the Calico StagedGlobalNetworkPolicy Resource Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Enterprise
- Calico StagedGlobalNetworkPolicy
- Calico GlobalNetworkPolicy
- Kubernetes custom resources
- kubectl
- calicoctl
- Network policy

## Sources Consulted
- Calico Enterprise staged network policies: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico Enterprise StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/stagedglobalnetworkpolicy
- Calico API Go package for StagedGlobalNetworkPolicy and stagedAction values: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3
- Calico Enterprise calicoctl get reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/get
- Calico Enterprise calicoctl apply reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/apply
- Calico Enterprise calicoctl validate reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/validate
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post described staged policies as being "committed" from a pending state. Calico staged policies do not enforce traffic directly; in Calico Enterprise the UI can enforce a staged policy by deleting the staged policy and creating or updating the enforced policy. I changed the wording to "creating or updating the enforced policy" and "once enforced."
- The post told readers to use `stagedAction` to confirm the policy had not been accidentally committed. `stagedAction` is a staged conversion action with values such as `Set`, `Delete`, `Learn`, and `Ignore`; the resource kind is what confirms the object is staged. I changed the guidance to check that the kind is `StagedGlobalNetworkPolicy` and that `stagedAction` is `Set` when the intended enforcement behavior is create/update.
- The post used `kubectl get events --field-selector reason=StagedPolicyValidation`, but I could not verify a Calico event reason named `StagedPolicyValidation` in the official documentation. I replaced it with `kubectl apply --dry-run=server -f allow-dns-egress-updated.yaml`, which uses Kubernetes API server validation without persisting the object.
- The post described `calicoctl get stagedglobalnetworkpolicies -o yaml | grep stagedAction` as a dry-run commit. This is only a read/list operation and does not preview a commit. I replaced it with guidance that there is no `calicoctl` dry-run commit for staged policies and that CLI enforcement should validate an equivalent `GlobalNetworkPolicy` manifest before applying it.
- The post recommended `calicoctl validate -f allow-dns-egress-updated.yaml` for a staged policy. Current official `calicoctl validate` documentation does not list staged policy resources among valid resource types. I replaced it with `kubectl apply --dry-run=server -f allow-dns-egress-updated.yaml`.

## Review Notes
The YAML examples use the correct `projectcalico.org/v3` API group, `StagedGlobalNetworkPolicy` kind, `stagedAction: Set`, egress rule structure, protocol values, and port list syntax. The `calicoctl get` and `calicoctl apply` usage is consistent with the official Calico Enterprise CLI reference.
