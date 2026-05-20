# Validation Summary: How to Deploy NetworkPolicies with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes NetworkPolicy
- Kubernetes CNI plugins
- Kustomize
- NetAssert
- Calico
- Cilium Hubble
- kubectl

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Kustomize patches documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- NetAssert README and command implementation: https://github.com/controlplaneio/netassert
- Calico Log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/

## Issues Found
- NetworkPolicy isolation was described as if any selected pod immediately denies all other traffic. Updated the wording to clarify that isolation is direction-specific for ingress and egress, matching Kubernetes NetworkPolicy behavior.
- The DNS egress policy selected kube-dns-labeled pods in any namespace. Restricted the selector to the `kube-system` namespace using the standard `kubernetes.io/metadata.name` namespace label.
- The sync wave section implied waves could order independent Applications. Clarified that sync waves order resources within the same Argo CD Application or a parent sync context.
- The validation hook was shown as a `PreSync` hook that could prove new policies would not break connectivity, and it used a non-existent NetAssert command shape. Changed it to a `PostSync` validation hook using NetAssert v2's YAML test spec and `netassert run --input-file`.
- The NetAssert job did not mention required runtime permissions. Added a note to bind the ServiceAccount to permissions required by the validation tool, including ephemeral container patching for NetAssert.
- The monitoring example used an invalid Calico ConfigMap pattern and described it as a logging sidecar. Replaced it with a Calico-specific temporary `Log` policy example and kept Cilium observability as a Hubble command.

## Review Notes
The examples are intentionally generic and still require environment-specific labels, namespaces, RBAC, runner images, and CNI support. NetworkPolicy behavior also varies for non-TCP/UDP/SCTP traffic and for service IP translation details depending on the CNI plugin.
