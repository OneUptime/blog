# Validation Summary: How to Monitor Calico ClusterIP Service Policy Impact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes Services and ClusterIP networking
- Kubernetes NetworkPolicy-style traffic control concepts
- `calicoctl`
- `kubectl`
- YAML configuration

## Sources Consulted
- Calico Open Source documentation: Apply Calico policy to services exposed externally as cluster IPs - https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico Open Source documentation: `calicoctl apply` command - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes documentation: Service types and ClusterIP behavior - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: `kubectl exec` command - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- GitHub author profile - https://github.com/nawazdhandala

## Issues Found
- The introduction described ClusterIP Services as broadly exposed to external traffic. Kubernetes ClusterIP Services are normally cluster-internal, while Calico's external ClusterIP guidance applies when ClusterIPs are advertised outside the cluster, such as over BGP. Updated the wording to reflect that scope.
- The phrase "ClusterIP Service Policies in Calico" implied a distinct Calico policy kind. Calico uses `NetworkPolicy` / `GlobalNetworkPolicy` resources and service policy rules rather than a separate ClusterIP Service Policy resource. Updated the wording to "Calico network policies for ClusterIP Service traffic."
- The first egress rule in the YAML snippet had duplicate `destination` keys. In YAML, the second key would overwrite the first in many parsers, dropping the database selector. Merged the selector and ports under one `destination` block.
- The port-based TCP rules did not specify `protocol: TCP`. Calico examples use protocol-specific rules with ports, and adding the protocol makes the intended traffic match explicit. Added `protocol: TCP` to the frontend, monitoring, and database rules.

## Review Notes
The corrected policy is a valid Calico namespaced `NetworkPolicy` for pods selected by `app == 'backend-service'`. For externally advertised ClusterIPs in cluster traffic mode, Calico's documentation may also require host endpoint `GlobalNetworkPolicy` with `preDNAT` and `applyOnForward`, depending on the deployment topology.
