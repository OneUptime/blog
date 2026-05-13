# Validation Summary: How to Debug Calico Policy Log Rules When Traffic Is Blocked in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico `NetworkPolicy` and `GlobalNetworkPolicy`
- `calicoctl`
- `kubectl`
- Linux kernel / iptables policy logs

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: FelixConfiguration resource reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Component logs - https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs

## Issues Found
- The introduction described Policy Log Rules as fine-grained network security controls and referred to logging as traffic control. Calico `Log` actions are diagnostic and do not make a terminal allow/deny decision, so this was changed to describe diagnostic visibility.
- The guide implied that a temporary log rule can identify any blocked traffic regardless of existing policy order. Calico continues evaluation after `Log`, but `Allow` and `Deny` are terminal actions, so a note was added explaining that known deny rules need a log rule immediately before the deny rule.
- The temporary policy used `order: 999`. This is syntactically valid, but Calico's own log-rule guidance uses a very high order for bottom-of-tier diagnostic logging. The example was changed to `order: 100001` to better match official guidance for catching unhandled traffic.
- The log review command searched for `CALICO`. Calico's default Felix `logPrefix` for rendered log rules is `calico-packet`, and iptables logs are kernel logs, so the command was changed to `sudo journalctl -k | grep "calico-packet" | tail -30`.
- The comment said to identify the blocking rule from the logs. With the default log prefix, the packet log reliably shows packet attributes, not necessarily the blocking policy name. The comment was changed to identify source, destination, and protocol, then fix selector or order.

## Review Notes
The examples are valid for Calico `projectcalico.org/v3` policy resources. The post focuses on iptables-style node logs; Calico eBPF policy logs use a different trace-pipe format, which would be useful future coverage if the article is expanded.
