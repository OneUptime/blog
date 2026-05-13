# Validation Summary: How to Debug Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico staged network policy
- Kubernetes NetworkPolicy
- Kubernetes custom resources
- kubectl
- Calico flow logs

## Sources Consulted
- Calico documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico documentation: Staged Kubernetes network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico documentation: Staged network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico documentation: Staged global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico documentation: calicoctl user reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post described staged Kubernetes NetworkPolicy as if it enforced traffic. Updated the description, introduction, implementation notes, architecture diagram, and conclusion to state that staged policies preview behavior without changing actual traffic flow.
- The main YAML used `kind: NetworkPolicy` with Calico selector-based policy fields (`order`, `selector`, `types`, `action`, `source`, `destination`) while the post was about `StagedKubernetesNetworkPolicy`. Replaced the snippet with `kind: StagedKubernetesNetworkPolicy` and Kubernetes NetworkPolicy-style fields (`podSelector`, `policyTypes`, `ingress.from`, `egress.to`, and `ports`).
- The post used `calicoctl` commands for staged Kubernetes policy management. Official Calico docs describe staged policy resources as Kubernetes custom resources managed with `kubectl`, and current `calicoctl` documented resource lists do not include staged policy resources. Replaced apply/get/delete/list commands with `kubectl` equivalents and staged-policy resource aliases.
- The metrics example used `felix_denied`, which is not a documented Felix metric in the Calico Open Source Felix Prometheus reference. Replaced it with guidance to inspect Calico flow logs and the `policies.pending` field where staged-policy preview data is available.
- The prerequisites claimed Calico v3.26+ was required for full staged Kubernetes NetworkPolicy support. Replaced this with a CRD-based prerequisite because the current official docs confirm the resource but the reviewed documentation did not substantiate the specific v3.26+ claim.
- The DNS guidance only mentioned UDP port 53. Updated it to include both UDP and TCP port 53, which is safer for real Kubernetes DNS behavior when egress is restricted.

## Review Notes
The guide is now accurate for Calico's documented staged Kubernetes NetworkPolicy model. Calico staged-policy visibility depends on the available Calico observability/flow-log setup, so the post now phrases flow-log inspection as conditional rather than assuming Felix metrics expose staged policy hit counters.
