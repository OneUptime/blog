# Validation Summary: How to Log and Audit Calico GlobalNetworkPolicy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Felix Prometheus metrics
- Linux kernel policy logs

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics setup: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The policy was described as a log/audit policy but only used `Allow` actions. Added `Log` rules before the matching `Allow` rules because Calico `Log` rules record matching traffic and then continue evaluating subsequent rules.
- The verification command checked for a `felix_denied` metric, which is not part of the documented open source Felix metrics. Replaced it with a check for the documented `felix_active_local_policies` metric when Felix Prometheus metrics are enabled.
- The verification step tailed `/var/log/calico/felix.log` for `DENY`, but Calico iptables policy logs are documented as kernel logs commonly visible through `journalctl`, `/var/log/syslog`, or `/var/log/kern.log` with the `calico-packet` prefix. Replaced the command with `journalctl -k -f | grep calico-packet`.

## Review Notes
The `Log` action can add significant overhead and should generally be removed after testing or auditing. Felix Prometheus metrics are disabled by default and require enabling `prometheusMetricsEnabled` before the metrics endpoint is useful.
