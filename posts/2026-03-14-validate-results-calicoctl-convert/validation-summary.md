# Validation Summary: How to Validate Results After Running calicoctl convert

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes NetworkPolicy
- kubectl
- Bash
- Python
- YAML

## Sources Consulted
- Tigera Calico documentation: calicoctl convert, https://docs.tigera.io/calico/latest/reference/calicoctl/convert
- Tigera Calico documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Tigera Calico documentation: Calico NetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Tigera Calico documentation: default deny behavior for Kubernetes pods, https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: kubectl generated command reference, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The structural validation Bash example used a pipeline into `while`, so `PASS` and `FAIL` were updated in a subshell and the final totals would normally print as zero. I changed it to feed the loop with process substitution and added `.yml` files alongside `.yaml`.
- The semantic equivalence script compared `policyTypes` and Calico `types` literally, which would flag valid policies that rely on documented defaulting. I added small defaulting helpers based on Kubernetes and Calico policy semantics.
- The semantic equivalence script interpolated shell variables directly into Python source. I changed it to pass filenames through `sys.argv`, avoiding quoting and path parsing errors.
- The troubleshooting section said Calico may need explicit deny rules for Kubernetes-style default deny. Calico documentation states that Calico NetworkPolicy follows Kubernetes pod default allow/default deny conventions, so I corrected the explanation.
- The named-port troubleshooting note implied named ports may convert only to numeric ports. Calico supports named ports and port ranges, so I broadened the note to tell readers to compare endpoint port definitions and rendered `destination.ports`.

## Review Notes
The equivalence checker remains intentionally simplified and should be treated as a smoke test rather than a complete semantic proof. It does not fully compare selectors, namespace selectors, peer rules, `endPort`, IP blocks, Calico ordering, or all multi-document conversion outputs.
