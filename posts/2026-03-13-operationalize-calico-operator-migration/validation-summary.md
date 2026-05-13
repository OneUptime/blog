# Validation Summary: How to Operationalize Calico Operator Migration

## Status
validated

## Post Type
Operational guide / Runbook (process-oriented tutorial with bash scripts, communication templates, and decision matrices)

## Technologies Covered
- Calico (project Calico v3.27.0)
- Tigera Operator
- Kubernetes (kubectl)
- calicoctl CLI
- Bash scripting
- Mermaid diagrams (for wave planning visualization)

## Sources Consulted
- Calico operator migration docs: https://docs.tigera.io/calico/latest/operations/operator-migration
- Tigera operator manifests: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
- calicoctl CLI reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- calicoctl resource definitions (NetworkPolicy, GlobalNetworkPolicy, IPPool, FelixConfiguration): https://docs.tigera.io/calico/latest/reference/resources/
- kubectl version deprecation notes (Kubernetes 1.27 release notes): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Installation operator CRD: https://docs.tigera.io/calico/latest/reference/installation/api

## Issues Found
- **`kubectl version --short`**: The `--short` flag was deprecated in Kubernetes 1.27 (April 2023) and made the default behavior starting in 1.28. By the post's 2026 timeframe, the flag is either fully removed or a no-op that emits a deprecation warning. Changed `kubectl version --short` to `kubectl version`, which produces the same short output by default in modern kubectl versions.

## Review Notes
- The `calicoctl` resource shortnames used (`ippools`, `gnp` for GlobalNetworkPolicy, `np` for NetworkPolicy) are all valid per the calicoctl reference.
- The `calicoctl get np --all-namespaces` form is supported by calicoctl.
- The `Installation` CR name `default` is correct — this is the standard singleton name for the operator's Installation resource (`installations.operator.tigera.io`).
- The Tigera operator manifest URL for Calico v3.27.0 (`https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml`) is valid; v3.27.0 was released in December 2023.
- The rollback script's ordering (delete `Installation` CR first, then delete the operator manifest) is correct in principle, but in production the operator may need time to clean up `calico-system` resources between those two steps; a `kubectl wait` for namespace deletion could harden it. Not a technical error — just an operational improvement worth noting.
- The grep pattern `grep -v "^  creationTimestamp\|^  uid\|^  resourceVersion"` relies on GNU grep's BRE alternation extension (`\|`), which is non-portable but works on all standard Linux distributions where this script would realistically run.
- The mermaid diagram syntax is valid.
- Content is process/operational rather than deep technical implementation — the technical correctness centers on the commands and resource names, all of which check out after the one fix above.
