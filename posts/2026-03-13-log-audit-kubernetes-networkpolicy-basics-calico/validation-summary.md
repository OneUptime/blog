# Validation Summary: How to Log and Audit Kubernetes NetworkPolicy Basics with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy concepts
- Calico NetworkPolicy
- Calico policy logging
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The original configuration used a standard Kubernetes `networking.k8s.io/v1` NetworkPolicy while the article described logging and the Calico `projectcalico.org/v3` API. Standard Kubernetes NetworkPolicy does not support Calico `Log` actions, so the example would not log or audit traffic as described. I changed the example to a Calico `projectcalico.org/v3` NetworkPolicy with paired `Log` and `Allow` rules.
- The original commands applied and inspected the policy with `kubectl` as a standard Kubernetes NetworkPolicy. I changed those commands to `calicoctl apply` and `calicoctl get networkpolicy ... -o yaml`, matching the Calico resource used in the corrected configuration.

## Review Notes
The corrected YAML was parsed successfully with the available local tooling. `kubectl` and `calicoctl` were not installed in the local environment, so CLI validation was performed against the official Kubernetes and Calico command references. Calico documentation notes that `Log` actions can add significant overhead and should generally be removed after troubleshooting or policy discovery.
