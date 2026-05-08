# Validation Summary: How to Validate Calico Operator Migration

## Status
validated

## Post Type
Tutorial / Validation guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- kubectl
- calicoctl
- Bash

## Sources Consulted
- Tigera Calico documentation: Migrate Calico to an operator-managed installation - https://docs.tigera.io/calico/latest/operations/operator-migration
- Tigera Calico documentation: calicoctl get reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Tigera Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Tigera Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Tigera Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes documentation: kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl expose reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- `calicoctl get ippool ... -o jsonpath=...` used a Kubernetes-style output mode that is not listed in the official `calicoctl get` output formats. Changed it to `-o go-template=...`, which is supported by `calicoctl`, to extract the IPPool CIDR.
- `calicoctl get globalnetworkpolicies --no-headers` used a `kubectl`-style flag that is not listed in the official `calicoctl get` options. Changed the count to use `calicoctl get globalnetworkpolicies -o yaml` and count YAML resource documents.
- The GlobalNetworkPolicy name diff mixed JSON output with `jq` for current resources and YAML parsing for backup resources. Changed the current side to parse YAML names as well, keeping both sides comparable without relying on unsupported JSONPath-style assumptions.

## Review Notes
- The Tigera documentation confirms that operator migration moves Calico resources from `kube-system` to `calico-system`, and that `kubectl get tigerastatus` / `kubectl describe tigerastatus calico` are appropriate status checks.
- The connectivity test is technically valid, but production clusters may have policies or admission controls that prevent creating ad hoc pods in `kube-system`; a future improvement could use a dedicated test namespace with explicit expected policy behavior.
