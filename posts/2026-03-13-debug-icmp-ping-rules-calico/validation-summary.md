# Validation Summary: How to Debug ICMP and Ping Rules When Traffic Is Blocked in Calico

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `NetworkPolicy` and `GlobalNetworkPolicy`
- ICMP and ICMPv6
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico documentation: Use ICMP/ping rules in policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico documentation: Use log rules to test network policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: NetworkPolicy resource reference, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Get started with Calico network policy, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: calicoctl get reference, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl delete reference, https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The traffic-identification command used `curl` against an HTTP service, which tests TCP/HTTP rather than ICMP. Changed it to `ping -c 3 target-pod-ip`, matching the post's ICMP and ping focus.
- The temporary log policy used `order: 999`, which may not log traffic blocked by earlier lower-order Calico policies because `Allow` and `Deny` actions are terminal. Changed the example to `order: 1` so the log rule can run before typical later policies while still allowing policy evaluation to continue.
- The temporary log policy only covered ingress and did not restrict logging to ICMP traffic. Updated it to log ICMP and ICMPv6 for both ingress and egress, which is more accurate for debugging ping request and response traffic.

## Review Notes
The Calico `NetworkPolicy` snippet uses the current `projectcalico.org/v3` API and valid `Log`, `ICMP`, and `ICMPv6` rule fields. The `calicoctl get` and `calicoctl delete` commands use documented resource operations and namespace handling. In a real cluster, the log location and prefix can vary by deployment and host logging configuration, so operators may need to inspect the relevant Calico node host logs rather than relying only on the exact `journalctl` pipeline shown.
