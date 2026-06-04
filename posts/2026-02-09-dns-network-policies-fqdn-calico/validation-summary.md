# Validation Summary: How to Implement DNS-Based Network Policies with FQDN Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico Enterprise
- Calico Cloud
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico FelixConfiguration
- DNS-based egress policy

## Sources Consulted
- Calico Enterprise DNS policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Cloud secure egress access / DNS policy documentation: https://docs.tigera.io/calico-cloud/tutorials/applications/egress-controls
- Calico Cloud FelixConfiguration resource documentation: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy behavior documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post described FQDN policies as a general Calico feature. Official docs place DNS/FQDN policy in Calico Enterprise and Calico Cloud, so the description and prerequisites now name those products.
- The post said Calico resolves DNS directly. Official docs describe Calico allowing IPs returned from trusted DNS servers, so the explanation now says Calico learns addresses from trusted DNS responses.
- The prerequisite command used `kubectl` and patched `DNSPolicyMode` to an invalid value, `"Enabled"`. The post now uses `calicoctl get` and patches `dnsPolicyMode` to the documented `DelayDeniedPacket` value.
- Namespaced policies attempted to allow DNS by selecting `k8s-app == "kube-dns"` without a `namespaceSelector`. In a namespaced Calico NetworkPolicy, a destination selector is scoped to the policy namespace by default, so those examples now allow UDP port 53 directly.
- The test pod was created without the `app=backend` label required by the policy selector. The `kubectl run` command now includes `--labels=app=backend`.
- The wildcard S3 example used multiple wildcard components in one domain, which Calico does not support. It now shows exact regional S3 endpoints and a single wildcard for a specific region.
- The verbose logging patch used `LogSeverityScreen` instead of the documented FelixConfiguration resource field `logSeverityScreen`.
- The DNS cache settings used nonexistent `DNSPolicyMaxTTL` and `DNSPolicyMinTTL` fields and invalid JSON comments. The example now uses the documented `dnsExtraTTL` field.
- The debugging command used `calico-node -felix-live`, which is a health check and not a DNS cache inspection command. It now shows the documented default DNS cache file path.
- The default-deny snippet put a deny-all rule before the domain allow rule, which would prevent the allow rule from being evaluated. The snippet now allows the domain first and denies remaining egress afterward.
- The monitoring `grep -v` command used an alternation pattern without extended regex mode. It now uses `grep -Ev`.

## Review Notes
Calico DNS policy wildcard matching is intentionally limited: exact names match only that name, and wildcard entries may contain only one full-label `*` component. For broad cloud services such as S3, explicit regional entries or network sets are usually safer and more maintainable than trying to express every endpoint shape in a single policy rule.
