# Validation Summary: Safely Updating the Calico StagedNetworkPolicy Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico StagedNetworkPolicy
- Kubernetes
- kubectl
- calicoctl
- Kubernetes RBAC

## Sources Consulted
- Calico staged network policies documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico API server and kubectl management documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The introduction incorrectly stated that a misconfigured StagedNetworkPolicy can disrupt networking, drop traffic, or break BGP peerings. Calico staged policies preview policy impact without changing actual traffic flow, so the text was corrected to explain that the risk is an inaccurate preview before later enforcement.
- The StagedNetworkPolicy workflow used `calicoctl get stagednetworkpolicy` and `calicoctl apply`. Current Calico documentation exposes StagedNetworkPolicy as a `projectcalico.org/v3` Kubernetes API resource and documents `kubectl` aliases for it, while the `calicoctl apply` valid resource list does not include staged policy resources. The examples were changed to `kubectl get stagednetworkpolicy.projectcalico.org` and `kubectl apply`.
- The original review checklist asked whether a staged-policy change would affect active connections, require Felix or BGP restart, or lock the user out of nodes. Those checks are inaccurate for staged policy updates, so they were replaced with checks about previewed allow/deny behavior, selector scope, and future enforcement impact.
- The rollback and verification commands were updated to use `kubectl` against the specific policy name and namespace, making the backup artifact directly reusable.
- The troubleshooting section implied pod connectivity loss or BGP drops could be caused by the StagedNetworkPolicy update. It now clarifies that staged policies do not enforce traffic and that simultaneous enforced policy or infrastructure changes should also be checked.
- The post stated that unknown fields are silently ignored by kubectl. Current `kubectl apply` defaults to strict validation where supported, so the text and apply examples were updated to use `--validate=strict`.
- The CRD version command only printed the default `kubectl get crds` columns, not served CRD versions. It was updated to print `.spec.versions[*].name`.
- The RBAC example combined `kubectl auth can-i --list` with a specific verb and resource and used an incorrect Calico resource name. It was replaced with valid `can-i create` and `can-i update` checks for `stagednetworkpolicies.projectcalico.org`.

## Review Notes
The remaining `calicoctl` examples for `node status`, `ipam show`, `version`, and `felixconfiguration` are consistent with Calico command references. The `calico-system` namespace examples are correct for operator-based installations; Calico documentation notes that manifest-based installs may use `kube-system`.
