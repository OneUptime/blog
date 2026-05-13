# Validation Summary: How to Log and Audit External IP Policies in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico FelixConfiguration
- Linux kernel/syslog policy logs

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: Use external IPs or networks rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The post used `flowLogsEnabled`, which is not a documented Calico Open Source FelixConfiguration field for policy `Log` actions. I replaced it with the documented `logPrefix` setting used when Felix renders policy log rules.
- The NetworkPolicy example did not actually match an external IP or CIDR; it allowed traffic from pods with `app == 'authorized'`. I changed the example to use `source.nets` with an external documentation CIDR.
- The `logSeveritySys` value used lowercase `info`; the FelixConfiguration resource schema documents `Info`. I updated the command to use the documented value.
- The query example searched `/var/log/calico/flow-logs/*.log` for `CALICO.*DENY`, but Calico policy `Log` action output is documented as kernel/syslog output with the `calico-packet` prefix for the standard Linux dataplane. I updated the query to use `journalctl -k` and the configured prefix.
- The "Ship Logs to Central Store" step did not configure log shipping. I renamed it to accurately describe enabling syslog logging.

## Review Notes
- The policy now demonstrates logging and allowing an example external source CIDR, then logging and denying unmatched ingress traffic. Real deployments should replace `203.0.113.0/24` with their approved external ranges or use Calico NetworkSet/GlobalNetworkSet resources for reusable IP lists.
- Calico log output differs by dataplane. The corrected query targets the standard Linux dataplane; eBPF policy logs are viewed differently.
