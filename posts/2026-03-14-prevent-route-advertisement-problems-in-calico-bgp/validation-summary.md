# Validation Summary: Preventing Route Advertisement Problems in Calico BGP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source, Calico Cloud, and Calico Enterprise
- Kubernetes
- BGP
- Calico `BGPConfiguration` and `IPPool` resources
- `calicoctl` and `kubectl`
- Prometheus and Prometheus Operator `PrometheusRule`
- Kyverno
- Linux routing and IP-in-IP

## Sources Consulted
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Cloud BGP metrics guide: https://docs.tigera.io/calico-cloud/operations/monitor/metrics/bgp-metrics
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl node` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kyverno ValidatingPolicy documentation: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno ClusterPolicy validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- IANA special-purpose AS number registry: https://www.iana.org/assignments/iana-as-numbers-special-registry

## Issues Found
- The introduction implied that losing a single BGP session always makes a node's pods unreachable from the rest of the cluster. Updated this to "all required BGP sessions" because impact depends on topology and which sessions fail.
- The BGP full-mesh guidance said "under 50 nodes"; Calico documentation describes full mesh as suitable for small and medium deployments of about 100 nodes or less. Updated the comment.
- The IPPool example set both `ipipMode` and `vxlanMode`. Calico documents these as mutually exclusive, so the explicit `vxlanMode: Never` line was removed.
- The infrastructure script claimed to check port 179 connectivity between all node pairs, but it only executed from the machine running the script. Updated the script and comments so the output accurately describes local-host-to-node checks.
- The Prometheus alert used `bird_protocol_up` and the verification command described Felix as exporting BGP metrics. Official Calico Open Source metrics cover Felix, Typha, and kube-controllers, while documented BGP peer metrics are exposed in Calico Cloud/Enterprise as `bgp_peers`. Updated the alert, verification command, and caveat text accordingly.
- The Kyverno example used a legacy `ClusterPolicy` as the primary policy. Updated the primary example to current `policies.kyverno.io/v1` `ValidatingPolicy` syntax and kept a corrected older `ClusterPolicy` example for older Kyverno releases.
- The `calicoctl node status` verification did not mention that the command must run on each Calico node. Added that requirement.
- The route verification command used interactive `kubectl debug` flags in a command substitution. Replaced `-it` with `--quiet` for a non-interactive route count.

## Review Notes
The Prometheus BGP session alert now depends on Calico Cloud, Calico Enterprise, or another exporter that provides `bgp_peers`; Calico Open Source users should rely on pod readiness or deploy a BGP-specific exporter for peer-level Prometheus alerts. The example Kyverno `ValidatingPolicy` validates numeric AS numbers in the 16-bit private range shown in the post; organizations using 32-bit private ASNs or dotted AS notation should adapt the policy.
