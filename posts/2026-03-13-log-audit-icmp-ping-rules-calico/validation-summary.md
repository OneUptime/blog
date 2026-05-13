# Validation Summary: How to Log and Audit ICMP and Ping Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico FelixConfiguration
- ICMP and ping traffic
- Linux journald/kernel logs

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: Use ICMP/ping rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Cloud documentation: FelixConfiguration flow log fields - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig

## Issues Found
- The original Step 1 used `flowLogsEnabled`, which is not the documented Calico Open Source FelixConfiguration field for policy logging. I replaced it with `logSeveritySys: "Info"` so Calico policy log output is sent to syslog.
- The original policy used `Log`, `Allow`, and `Deny` actions without matching ICMP, so it applied to all ingress traffic rather than ICMP/ping traffic. I added `protocol: ICMP` and `icmp` type/code matches for ICMP echo requests.
- The original policy logged allowed traffic without repeating the same source selector on the preceding `Log` rule. I added the authorized source selector to the first `Log` rule so it logs the intended allowed ping traffic before the matching `Allow`.
- The original Step 4 searched `/var/log/calico/flow-logs/*.log` and `CALICO.*DENY`, but Calico Open Source `Log` actions are documented as kernel/syslog logs on the standard Linux dataplane, usually visible through `journalctl`, `/var/log/syslog`, or `/var/log/kern.log`, with the default `calico-packet` prefix. I changed the commands to query kernel logs with `journalctl -k` and filter for ICMP policy log entries.

## Review Notes
Calico Enterprise and Calico Cloud have separate flow-log features and Felix fields such as `flowLogsFileEnabled` and `flowLogsFileDirectory`. The reviewed post now uses Calico Open Source policy `Log` actions instead, which is appropriate for the stated `projectcalico.org/v3` NetworkPolicy example.
