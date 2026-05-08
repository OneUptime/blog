# Validation Summary: How to Validate Resolution of Network Policy Not Taking Effect in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy
- Calico Felix
- Kubernetes
- kubectl
- Linux iptables

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calico/node configuration and readiness reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico ICMP/ping policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl create job reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The temporary traffic-test Pods were created and then immediately used with `kubectl exec`. This can fail before the Pod reaches Ready. Added `kubectl wait --for=condition=Ready ... --timeout=60s` before each exec.
- The iptables validation step counted only `cali-pi` chains and described the check as universal. Calico policy chains may include inbound and outbound policy chains, and iptables inspection only applies to the iptables dataplane. Updated the step to qualify the dataplane and count both `cali-pi-` and `cali-po-` chains via `iptables-save`.
- The conclusion referred specifically to iptables rules as a general requirement. Updated it to "dataplane rules" so the statement remains accurate for Calico deployments that are not using the iptables dataplane.

## Review Notes
The ping examples are valid for Calico policies that explicitly allow or deny ICMP. For Kubernetes NetworkPolicy-only scenarios, protocol-specific TCP/UDP/SCTP tests are usually preferable because ICMP behavior is plugin-dependent.
