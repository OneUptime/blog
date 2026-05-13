# Validation Summary: How to Log and Audit DoS Defense Calico Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico GlobalNetworkPolicy
- calicoctl
- Calico eBPF dataplane
- Linux kernel policy logs

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico eBPF dataplane enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Felix Prometheus configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- RFC 5737 IPv4 documentation address blocks: https://datatracker.ietf.org/doc/html/rfc5737

## Issues Found
- The main policy was named and commented as if it configured rate limiting, but the shown Calico GlobalNetworkPolicy only allowed traffic. Calico policy rules support actions such as `Allow`, `Deny`, and `Log`; they do not implement the rate limit shown by the original wording. I renamed the example policy and removed the inaccurate rate-limit note.
- The guide claimed to cover logging and auditing, but the policy examples did not include `action: Log`. I added `Log` rules before the relevant `Allow` and `Deny` rules, matching Calico's documented behavior that log processing continues to the next rule.
- The allow rule matched destination ports without an explicit protocol. Calico policy examples specify `protocol: TCP` when matching TCP ports, so I added `protocol: TCP` to the web allow and log rules.
- The implementation commands used undocumented `felix_denied` and `felix_denied_packets_total` metric names for denial monitoring. I replaced them with documented policy log inspection commands for iptables dataplane nodes and eBPF dataplane nodes.
- The eBPF section stated that enabling eBPF provides rate limiting support. I changed it to describe optional eBPF dataplane enablement and updated the `kubectl patch` command to the documented Tigera operator resource and fields.
- The example bad-actor CIDRs used RFC 5737 documentation ranges while calling them known attack sources. I changed the wording to identify them as example blocked sources.

## Review Notes
The corrected post is technically valid as a basic Calico policy logging and blocking guide. Calico log rules can add overhead and should generally be removed or narrowed after troubleshooting; the conclusion's recommendation to maintain comprehensive logging should be interpreted with that operational caveat.
