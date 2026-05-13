# Validation Summary: How to Debug Calico External IP Policies When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Calico network policy
- Calico GlobalNetworkPolicy and NetworkPolicy resources
- Kubernetes NetworkPolicy
- kubectl
- calicoctl
- Python ipaddress module
- Mermaid diagrams

## Sources Consulted
- Calico documentation: GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: external IPs or networks in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: log rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: NetworkPolicy ipBlock behavior: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Python documentation: ipaddress module: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The curl example used `http://external-ip:443`, which is usually a protocol/port mismatch for HTTPS endpoints. Changed it to `https://external-ip` while preserving the intent of testing connectivity from inside the pod.
- The Kubernetes `ipBlock` lookup used `calicoctl get networkpolicies`. Calico NetworkPolicy resources use `nets`, while Kubernetes NetworkPolicy resources use `ipBlock`. Changed the command to `kubectl get networkpolicies --all-namespaces -o yaml | grep -A 5 ipBlock`.
- The global policy order check sorted by the fourth column, but Calico troubleshooting documentation shows `GlobalNetworkPolicy -o wide` columns as `NAME ORDER SELECTOR`. Changed the sort key from `-k4` to `-k2`.
- The debug log policy used only `action: Log`. Calico documentation states that processing continues after a `Log` action and recommends pairing log actions with an explicit allow to avoid unintended denial. Added an `Allow` rule immediately after the `Log` rule and clarified that the order must be before the deny policy being debugged.

## Review Notes
Local `kubectl` and `calicoctl` binaries were not installed in the review workspace, so CLI syntax and output were validated against official documentation instead of local `--help` output. The post remains version-appropriate for Calico v3.26+ based on the current `projectcalico.org/v3` resource documentation.
