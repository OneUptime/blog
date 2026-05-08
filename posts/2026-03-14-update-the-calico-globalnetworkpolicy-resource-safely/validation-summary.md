# Validation Summary: Safely Updating the Calico GlobalNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico calicoctl CLI
- Kubernetes kubectl CLI
- Kubernetes RBAC
- Kubernetes CustomResourceDefinitions

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes CRD field pruning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#field-pruning
- Kubernetes server-side field validation documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/#field-validation

## Issues Found
- The apply step described `calicoctl apply` as validation. I added `calicoctl validate -f globalnetworkpolicy.yaml` before `calicoctl apply` because Calico documents `validate` as the command for offline structure, syntax, and Calico-specific validation.
- The Calico log commands assumed the `calico-system` namespace. I added a note to adjust the namespace for installations that run Calico in `kube-system`.
- The troubleshooting section said unknown fields are silently ignored by `kubectl`. I changed this to explain that Kubernetes may warn, reject, or prune unknown fields depending on server-side field validation and the CRD schema.
- The RBAC permissions example combined a specific `kubectl auth can-i` resource check with `--list`. I split it into a direct permission check and a separate `--list` command filtered for `globalnetworkpolicies`, matching the documented `kubectl auth can-i` usage.

## Review Notes
The remaining commands are consistent with current Calico and Kubernetes documentation. The `calicoctl get globalnetworkpolicy -o yaml` output is documented as valid input for Calico resource management commands, and `calicoctl apply` replaces an existing resource specification in its entirety, so operators should keep using complete manifests for updates and rollbacks.
