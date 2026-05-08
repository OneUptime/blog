# Validation Summary: How to Validate Calico GlobalNetworkPolicy Before Production

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Felix Prometheus metrics
- Calico policy logging

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl resource aliases reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules

## Issues Found
- The description said GlobalNetworkPolicy applies across all namespaces, but the documented scope is endpoints selected by the policy, including workload endpoints across namespaces and host endpoints where present. Updated the wording to say "all namespaces and matching endpoints."
- The introduction had a grammatical error in "covers validate GlobalNetworkPolicy." Updated it to "covers validating GlobalNetworkPolicy."
- The verification command used `grep felix_denied`, but current Calico open-source Felix metrics document metrics such as `felix_active_local_policies`; policy denied counters are not documented as `felix_denied` on the Felix metrics endpoint. Updated the example to check `felix_active_local_policies`.
- The log command tailed `/var/log/calico/felix.log` for `DENY`, but Calico policy log rules document kernel/syslog-style `calico-packet` logs for the iptables dataplane and require Log rules for policy logging. Updated the command to use `journalctl -k | grep calico-packet`.

## Review Notes
The GlobalNetworkPolicy YAML uses the current `projectcalico.org/v3` API and valid rule fields for Calico v3.26+. The policy is broad because `selector: all()` selects all in-scope resources, so it should be validated carefully in staging before production.
