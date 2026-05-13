# Validation Summary: How to Debug Default Deny Policies in Calico When Traffic Is Blocked

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy and GlobalNetworkPolicy
- calicoctl
- FelixConfiguration
- Linux kernel/syslog policy logging
- eBPF policy logging

## Sources Consulted
- Calico Open Source documentation: GlobalNetworkPolicy resource, including `order`, `tier`, `Log`, `Allow`, and `Deny` rule behavior: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: NetworkPolicy resource, selector behavior, rule actions, and `Log` action processing: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Log rules for testing network policy, including iptables and eBPF log locations: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source documentation: calicoctl get command, supported resource types, pluralized resource names, namespaces, and `wide` output: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl apply command and `-f`/`--filename` usage: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source documentation: Component logs and Felix log level configuration through FelixConfiguration: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico Open Source documentation: Felix configuration reference for `FELIX_LOGSEVERITYSCREEN`, `logSeverityScreen`, and log-prefix behavior: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: calicoctl configuration guidance and current recommendation to use the Calico API server with `kubectl` for most operations in newer releases: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The introduction claimed Calico provides policy hit counters and can log every denied packet. I changed this to `calicoctl`, log rules, and flow logs, and clarified that Calico `Log` actions produce an audit trail for matching traffic before an allow or deny decision. This matches Calico's documented `Log` action behavior, where processing continues after the log rule.
- The prerequisites said Calico flow logging is enabled through Felix configuration. I changed this to require access to Calico policy logs through `journalctl`, `/var/log/syslog`, `/var/log/kern.log`, or the eBPF trace pipe. Calico policy log rules and flow logs are distinct features, and the documented policy-log locations depend on the dataplane.
- The temporary log policy omitted an explicit tier. I added `tier: default` to align with Calico's documented examples for global log policies and make policy ordering clearer.
- The log-check command searched kubelet logs for Calico output. I changed it to search kernel/syslog output for the default `calico-packet` prefix, matching Calico's documented iptables dataplane policy log locations.
- The post referenced `calicoctl policy trace`, which I could not verify in current official Calico Open Source or Enterprise calicoctl references. I changed the section to use Calico policy/Felix logs and FelixConfiguration, which is the documented way to adjust Felix log verbosity.
- The Felix debug example changed the calico-node DaemonSet environment directly in `kube-system`. I changed it to use the FelixConfiguration API and `calico-system` log example from current Calico docs.
- The flow diagram ended with "Trace packet path", which overstated what the corrected log-based workflow does. I changed it to "Inspect policy logs."

## Review Notes
The remaining `calicoctl` examples are valid, but current Calico documentation notes that newer installations with the Calico API server can use `kubectl` for most `projectcalico.org/v3` resources. Keeping `calicoctl` is acceptable here because the post lists it as a prerequisite and the commands are still documented.
