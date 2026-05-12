# Validation Summary: How to Roll Out NodePort Traffic Policies in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3)
- Kubernetes NodePort services
- GlobalNetworkPolicy (preDNAT, applyOnForward)
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy docs: https://docs.tigera.io/calico/latest/network-policy/policy-rules/pre-dnat
- Calico EntityRule / port syntax: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy#entityrule
- Kubernetes Service NodePort range docs: https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- **Port range syntax was invalid.** The original YAML used `ports: [30000-32767]`, but Calico's `EntityRule.ports` field requires port ranges to use the colon separator (`:`), not a dash, and ranges must be quoted strings in YAML so they aren't misparsed. Changed both occurrences to `ports: ["30000:32767"]` to match the documented Calico port range format. Without this fix, `calicoctl apply` would reject the manifest.

## Review Notes
- `preDNAT: true` requires `applyOnForward: true` and that `types` only contain `Ingress` — both conditions are satisfied.
- The selector `has(kubernetes.io/hostname)` assumes Calico HostEndpoints exist (either manually configured or via auto-host-endpoints). Pre-DNAT policies only take effect on HostEndpoints, so readers should ensure HostEndpoints are configured for this policy to apply.
- The source allow-list covers `10.0.0.0/8` and `172.16.0.0/12` but omits `192.168.0.0/16`; that may be deliberate and is not a technical error.
- The default Kubernetes NodePort range is 30000–32767, which matches the policy. Clusters with a customized `--service-node-port-range` will need to adjust the range accordingly.
