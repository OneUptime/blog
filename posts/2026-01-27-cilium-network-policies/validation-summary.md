# Validation Summary: How to Use Cilium Network Policies

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Cilium policy enforcement modes and policy audit mode
- Cilium L3/L4, L7 HTTP, DNS, FQDN, and deny policies
- Hubble observability
- Helm, kubectl, and Cilium CLI/debug commands
- OpenTelemetry Collector / Prometheus scraping

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 3 Policies, entities, CIDR, DNS, and FQDN policy examples: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 Policies and HTTP header matching: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes policy constructs and clusterwide policy examples: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Policy Audit Mode / Creating Policies from Verdicts: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium Hubble setup and Hubble CLI installation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI flow inspection: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Helm reference for `policyEnforcementMode`: https://docs.cilium.io/en/latest/helm-reference/
- Cilium command reference for `cilium-dbg endpoint`: https://docs.cilium.io/en/stable/cmdref/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- Corrected the description of Kubernetes NetworkPolicy from "IP addresses and ports" to L3/L4 selectors including pods, namespaces, IP blocks, and ports. Kubernetes NetworkPolicy supports pod and namespace selectors, not only IP selectors.
- Added a Kafka deprecation caveat because current Cilium documentation marks Kafka L7 policy support as deprecated.
- Replaced `cilium endpoint list/get` examples with `kubectl ... cilium-dbg endpoint list/get` and `kubectl get ciliumendpoints -A`, matching the current Cilium debug tooling.
- Fixed the enforcement-mode explanation for `enable-policy: never`. It disables policy enforcement; it is not audit mode.
- Replaced the audit-mode example from `enable-policy: never` to `policy-audit-mode: true`, added the required Cilium restart, and changed the Hubble observation example to policy verdict events.
- Fixed the CIDR egress example. The original `toCIDRSet: 0.0.0.0/0 except private ranges` was an allow rule that broadened egress; it now uses `egressDeny` for private ranges.
- Changed documentation-only CIDR ranges so they are not described as real Stripe or PayPal IP ranges.
- Fixed HTTP header matching for the admin token example. The original `headers: "X-Admin-Token: .*"` implied regex matching in the simple headers field; it now uses `headerMatches` for header presence.
- Replaced invalid `toEntities: kube-dns` examples with `toEndpoints` selectors for kube-dns/CoreDNS pods and added DNS L7 rules where FQDN learning or DNS visibility requires the DNS proxy.
- Corrected the reserved-identity diagram and comments: `kube-dns` is not a reserved entity, and the `health` entity refers to Cilium health endpoints rather than kubelet probes.
- Updated Hubble CLI install commands to use the current `main/stable.txt`, architecture handling, checksum verification, and `tar xzvfC` installation flow from official docs.

## Review Notes
- All YAML code fences were parsed successfully after edits.
- The examples remain version-neutral, but Cilium behavior can vary with installation options such as the L7 proxy, Hubble Relay/TLS settings, and cluster DNS labels.
