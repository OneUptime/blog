# Validation Summary: Runbook: Health Checks Failing After Enabling Calico Policies

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- kubectl
- Kubernetes liveness/readiness probes
- kubelet

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico documentation on NetworkPolicy and kubelet probes: https://docs.tigera.io/calico/latest/network-policy/
- kubectl reference (wait, get, describe, edit, delete): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
No technical issues found.

- The NetworkPolicy YAML uses the correct `apiVersion: networking.k8s.io/v1` and well-formed `podSelector`, `policyTypes`, and `ingress` blocks (with `ipBlock` and `ports`).
- The JSONPath expression for extracting node InternalIPs is syntactically correct and produces newline-separated addresses.
- The `kubectl wait pods --all --for=condition=Ready --timeout=120s` command is valid.
- The `--sort-by='.metadata.creationTimestamp'` flag is correct for `kubectl get`.
- The core technical premise is accurate: kubelet-originated liveness/readiness probes leave from the node's IP (not a pod IP), so a Calico/Kubernetes NetworkPolicy that blocks traffic from the node CIDR will break probes — the documented remediation (adding a node-CIDR `ipBlock` ingress rule for the probe port) is the standard fix.

## Review Notes
- The example node CIDR `10.0.0.0/8` is intentionally broad and works as a placeholder, but in real environments operators should narrow it to the actual node subnet (often a /16 or /24) to avoid accidentally allowing unintended ranges.
- For environments using `hostNetwork: true` pods or specific source-IP behavior (some cloud load balancers), additional ingress allowances may be required — the mermaid flow correctly hints at this via the "Check if HostNetwork pods involved" branch.
- Calico-specific `GlobalNetworkPolicy` and `failsafe ports` (Calico's built-in protection for kubelet/etcd ports) are not mentioned; they can be a complementary preventive control but are out of scope for this fast-recovery runbook.
- The runbook is appropriately scoped for on-call use with a 10-minute target recovery window.
