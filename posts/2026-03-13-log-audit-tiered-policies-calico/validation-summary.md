# Validation Summary: How to Log and Audit Calico Tiered Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico policy tiers
- FelixConfiguration
- Linux kernel/syslog policy logging

## Sources Consulted
- Calico Open Source policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico Open Source log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source flow logs / Whisker documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Cloud FelixConfiguration resource reference for file-based flow log fields: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig

## Issues Found
- The post used `FelixConfiguration.spec.flowLogsEnabled`, which is not a documented Calico Open Source FelixConfiguration field. I changed Step 1 to configure the documented `logPrefix` field that Felix uses when rendering policy `Log` rules.
- The post set `logSeveritySys` to lowercase `info`. The documented accepted value is `Info`; because that setting controls Felix syslog severity rather than policy `Log` rule output, I removed the example instead of keeping a corrected but misleading command.
- The post implied policy `Log` actions are written under `/var/log/calico/flow-logs/*.log`. Current Calico Open Source documentation says iptables policy logs are commonly found through `journalctl`, `/var/log/syslog`, or `/var/log/kern.log`, while eBPF logs are viewed with `bpftool prog tracelog`. I changed the query examples to use kernel/syslog locations for policy log actions.
- The Step 3 command did not actually ship logs to a central store; it only changed Felix syslog severity. I changed the example to a `journalctl` command that matches the documented policy log output source without inventing a specific log shipping stack.

## Review Notes
The policy YAML uses Calico `NetworkPolicy` with `action: Log`, followed by `Allow` and `Deny` rules, which matches Calico's documented behavior that `Log` is non-terminating and evaluation continues to the next rule. The post remains scoped to practical policy logging; future improvements could add a concrete `Tier` resource and `spec.tier` value if the guide should demonstrate a non-default tier explicitly.
