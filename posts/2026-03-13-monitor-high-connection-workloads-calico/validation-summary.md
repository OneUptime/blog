# Validation Summary: How to Monitor Calico Policy Impact on High-Connection Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy
- Calico FelixConfiguration
- Kubernetes
- calicoctl
- kubectl
- Linux conntrack

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico v3.26 CRD manifest for FelixConfiguration schema: https://raw.githubusercontent.com/projectcalico/calico/release-v3.26/manifests/calico.yaml
- Calico v3.32 CRD manifest for FelixConfiguration schema: https://raw.githubusercontent.com/projectcalico/calico/release-v3.32/manifests/calico.yaml

## Issues Found
- The Felix patch used `ipSetSize`, which is not a documented `FelixConfiguration` field in Calico v3.26 or current Calico CRDs. I removed that field so the patch will not be rejected by schema validation.
- The Felix patch used `kubectl patch felixconfiguration default` while the post otherwise refers to Calico's `projectcalico.org/v3` API. Calico's FelixConfiguration documentation shows `calicoctl patch felixconfig default` for v3 resources, so I changed the command to `calicoctl patch felixconfiguration default`.
- The tuning example set `maxIpsetSize` to `1048576`, which is the documented default and controls IP set membership capacity, not connection count. I removed it from the high-connection tuning example and kept the documented `prometheusMetricsEnabled` setting for monitoring.

## Review Notes
The NetworkPolicy manifest uses valid Calico `projectcalico.org/v3` fields, including `order`, `selector`, `ingress`, `egress`, rule `action`, endpoint selectors, UDP DNS egress ports, and `types`. The `conntrack -S` command is valid for inspecting kernel connection tracking statistics, but the placeholder `calico-node-xxx` must be replaced with a real calico-node pod name and the command depends on `conntrack` being available in that execution environment.
