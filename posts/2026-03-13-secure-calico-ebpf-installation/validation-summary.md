# Validation Summary: How to Secure Calico eBPF Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Tigera Operator, Felix, GlobalNetworkPolicy)
- Kubernetes
- eBPF dataplane
- Pod Security Admission
- Prometheus (for Felix metrics)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector
- Tigera Operator manifests on GitHub: https://github.com/projectcalico/calico/blob/v3.27.0/manifests/tigera-operator.yaml
- Kubernetes Pod Security Admission docs: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Other validated Calico posts in this repository for selector syntax convention

## Issues Found
- **GlobalNetworkPolicy selector syntax was incorrect.** The original selector `"!has(calico-system) && !has(kube-system)"` checks whether pods have labels literally named `calico-system` or `kube-system`, which is not how Calico identifies pods by namespace. The intended behavior (exclude pods in the Calico/Kubernetes system namespaces from the default-deny rule) requires matching the `projectcalico.org/namespace` label that Calico automatically applies to workload endpoints. Replaced with `projectcalico.org/namespace not in {'kube-system', 'calico-system', 'calico-apiserver', 'tigera-operator'}`, which matches the syntax used in other validated Calico posts in this repo and the official Calico documentation. Also added `calico-apiserver` and `tigera-operator` to the exclusion set since these are also Calico-managed system namespaces that should not be cut off by default-deny.

## Review Notes
- The post pins to Calico v3.27.0, which was released in December 2023. As of the review date (2026-05-12), newer Calico releases exist; readers may wish to substitute a more recent version. The technical content of the guide is not version-specific beyond the manifest URL.
- The `wget`/`nslookup` validation pattern using `kubectl run --restart=Never -- <cmd> && echo OK || echo FAIL` does not actually capture the in-pod exit code reliably, because `kubectl run` with `--restart=Never` does not attach by default. The check works only if `kubectl run` itself fails (which would not happen for an in-pod policy block). A more reliable check would use `kubectl run ... --attach --rm -i --restart=Never -- <cmd>` or `kubectl exec` against a long-running pod. Left as-is since this is a minor scripting nuance rather than a technical inaccuracy in the Calico content.
- `failsafeInboundHostPorts`/`failsafeOutboundHostPorts` field names, value formats (lowercase `tcp`/`udp`), `prometheusMetricsPort: 9091` (default), `logSeverityScreen: Info`, and the default-deny pattern (types specified with no rules) are all correct.
- Pod Security Admission labels (`pod-security.kubernetes.io/enforce`, `pod-security.kubernetes.io/audit`) and the `restricted` profile name are correct.
