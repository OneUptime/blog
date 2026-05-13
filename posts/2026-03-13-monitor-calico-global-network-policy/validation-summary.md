# Validation Summary: How to Monitor Calico GlobalNetworkPolicy Impact

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Felix Prometheus metrics
- Calico policy logging

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The description said GlobalNetworkPolicy applies across namespaces only. Updated it to mention configured host endpoints because Calico GlobalNetworkPolicy can apply to workload endpoints across all namespaces and to host endpoints.
- The introduction had a grammar issue that made the technical purpose unclear. Changed "covers monitor" to "covers monitoring".
- The policy verification section referred to `felix_denied` as a policy hit counter. The current Calico Felix metrics reference does not document a `felix_denied` policy hit counter, so the command now checks the documented `felix_active_local_policies` metric instead.
- The policy logging command tailed `/var/log/calico/felix.log` and grepped for `DENY`, but Calico policy `Log` actions are documented as packet logs in kernel/syslog locations for the Linux iptables dataplane. Added explicit `Log` and `Deny` rules to the sample policy and changed the verification command to use `journalctl -k -f | grep calico-packet`.
- The `calicoctl get` example used the plural resource name `globalnetworkpolicies`. Changed it to the singular `globalnetworkpolicy`, which matches the resource name used in the official `calicoctl` documentation.

## Review Notes
Felix Prometheus metrics must be enabled before the localhost `:9091` metrics command will work. Calico Open Source flow logs through Whisker/Goldmane are available in current releases, but the post's simple CLI-based verification now avoids depending on that optional observability stack.
