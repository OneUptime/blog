# Validation Summary: How to Debug External IP Policies When Traffic Is Blocked in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- `calicoctl`
- `kubectl`
- Calico `NetworkPolicy` and `GlobalNetworkPolicy`

## Sources Consulted
- Calico Open Source documentation: Use external IPs or networks rules in policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico Open Source documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: Network policy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Use log rules to test network policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl delete, https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico Open Source documentation: calicoctl user reference and resource aliases, https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The introduction described "External IP Policies" as if it were a distinct Calico API concept. Calico documents external IP/CIDR matching as policy rules using `nets`, network sets, `NetworkPolicy`, and `GlobalNetworkPolicy`, so the wording was changed to "External IP rules in Calico policies."
- The traffic test used `target-service`, which describes in-cluster service traffic rather than traffic to an external IP or hostname. It was changed to a variable-based external endpoint example.
- The temporary log policy used an ingress-only rule, but the test command is pod-to-external-destination traffic. The policy was changed to log egress traffic.
- The log rule used `order: 999` and had no following allow rule. Calico recommends placing log rules at a high order and pairing `Log` with an explicit `Allow` to avoid tier default denial during testing, so the example now uses `order: 100000` and an immediate `Allow`.
- The log review command searched for uppercase `CALICO` in all journal messages. Calico's documented iptables log examples use `calico-packet` in kernel logs, so the command now searches kernel logs for `calico-packet` case-insensitively.
- The architecture diagram labelled the allowed destination as a pod, which did not match the external IP topic. It now labels the destination as an external endpoint.

## Review Notes
The post is accurate as a concise egress debugging workflow after the fixes. Calico eBPF dataplane logs are viewed differently, using `bpftool prog tracelog` from the `calico-node` DaemonSet, so a future expansion could add a dataplane-specific note.
