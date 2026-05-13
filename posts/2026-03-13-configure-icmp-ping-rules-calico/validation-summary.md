# Validation Summary: How to Configure ICMP and Ping Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes
- ICMP / ping
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Use ICMP/ping rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- IANA ICMP parameters registry - https://www.iana.org/assignments/icmp-parameters

## Issues Found
- The original policy example did not match ICMP traffic. It allowed ingress from a selector without specifying `protocol: ICMP` or an `icmp` match, and it included an unrelated egress rule for TCP-style HTTP/HTTPS ports. I changed the example to an ingress ICMP echo-request rule using Calico's documented `protocol: ICMP` and `icmp.type: 8` fields.
- The original test command used `curl`, which tests HTTP rather than ICMP/ping behavior. I changed it to run `ping -c 3` from an authorized test pod to a target pod IP.
- The conclusion referred broadly to bidirectional rule coverage even though the corrected example controls ingress ping requests only. I changed that wording to refer to rule coverage for the traffic direction being controlled.

## Review Notes
- The post now demonstrates IPv4 ICMP echo requests. Calico also supports ICMPv6 via `protocol: ICMPv6` and ICMPv6 echo request type 128, which could be added in a future expanded version.
- The `calicoctl get networkpolicies -n production -o wide` command is consistent with Calico's documented resource pluralization, namespace flag, and `wide` output format.
