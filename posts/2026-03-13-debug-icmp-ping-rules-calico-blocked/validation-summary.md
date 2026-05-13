# Validation Summary: How to Debug ICMP and Ping Rules in Calico When Traffic Is Blocked

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes
- Network policy
- ICMP and ping
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Use ICMP/ping rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico documentation: NetworkPolicy resource schema: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl apply: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- IANA ICMP Parameters registry: https://www.iana.org/assignments/icmp-parameters

## Issues Found
- The configuration example did not actually match ICMP or ping traffic. I changed the ingress rule to use `protocol: ICMP` with `icmp.type: 8` and `icmp.code: 0`, which matches IPv4 Echo Request packets used by ping.
- The policy selected all pods in the namespace and included an unrelated DNS egress rule, which could unintentionally isolate egress traffic for the namespace. I changed the selector to `app == 'target'` and made the policy ingress-only so it demonstrates allowing ping to the target workload.
- The implementation tested HTTP traffic with `curl`, not ICMP. I changed it to `kubectl exec -n production test-pod -- ping -c 3 target`.
- The post had duplicated placeholder wording in the introduction, policy name, and conclusion. I corrected those references so they describe Calico and ICMP/ping accurately.

## Review Notes
The examples assume the target workload is labeled `app=target`, the source workload is labeled `app=authorized`, and the container image used for `test-pod` includes the `ping` utility. Calico also supports ICMPv6 with `protocol: ICMPv6`, but the post now focuses on IPv4 ping because the example uses ICMP type 8/code 0.
