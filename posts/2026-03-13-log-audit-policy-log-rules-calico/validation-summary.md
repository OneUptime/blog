# Validation Summary: How to Log and Audit Calico Policy Log Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico `NetworkPolicy`
- Calico `FelixConfiguration`
- Calico policy `Log` actions
- Linux kernel/syslog policy log inspection with `journalctl`

## Sources Consulted
- Calico Open Source documentation, "Use log rules to test network policy": https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source documentation, "Network policy" resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation, "Felix configuration" resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico v3.26.0 FelixConfiguration CRD source: https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml

## Issues Found
- The post used `flowLogsEnabled`, which is not a valid Calico v3.26 FelixConfiguration field and also confused Calico policy `Log` actions with Flow Logs. I changed the first command to set `logSeveritySys: "Info"`, which is a documented FelixConfiguration field for syslog output.
- The post set `logSeveritySys` to lowercase `"info"`. The current FelixConfiguration documentation lists severity values as `Debug`, `Error`, `Fatal`, `Info`, `Trace`, and `Warning`, so the corrected command uses `"Info"`.
- The post claimed logs would be in `/var/log/calico/flow-logs/*.log` and queried for `CALICO.*DENY`. Calico Open Source policy `Log` actions in the iptables data plane are documented as kernel/syslog entries using the default `calico-packet` prefix, so I changed the query to `journalctl -k -g "calico-packet" | tail -20`.
- The "Ship Logs to Central Store" step did not actually configure shipping and reused the invalid lowercase severity example. I changed it to configure a stable `logPrefix`, which is documented and exists in the v3.26 FelixConfiguration CRD.

## Review Notes
- The policy YAML uses Calico's `projectcalico.org/v3` `NetworkPolicy` and valid `action: Log`, `Allow`, and `Deny` rules. Calico documents that `Log` is non-terminating, while `Allow` and `Deny` are final.
- The `journalctl -g` option requires a systemd journal implementation that supports grep-style filtering. On older nodes, `journalctl -k | grep "calico-packet"` may be needed.
