# Validation Summary: How to Configure Calico Policy Log Rules in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico policy log rules
- calicoctl
- kubectl
- YAML

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: Network policy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The sample policy did not include any `action: Log` rules, so it did not actually configure Calico policy logging. Added `Log` rules before the matching `Allow` rules. This matches Calico's documented behavior where `Log` records matching traffic and policy evaluation continues to the next rule.
- The egress rules matched destination ports 80 and 443 but did not specify a protocol. Added `protocol: TCP` to the egress log and allow rules to make the port match explicit for HTTP/HTTPS traffic.
- The test command used `http://target-service:8080`, but the policy only allowed egress to ports 80 and 443. Changed the test command to `http://target-service`, which uses port 80 and matches the sample egress policy.

## Review Notes
The post is now technically aligned with Calico's documented `NetworkPolicy` schema and log-rule behavior. In a future revision, the post could show where to inspect Calico policy logs for the active data plane, because log output locations differ between the Linux iptables and eBPF data planes.
