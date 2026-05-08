# Validation Summary: Zero Trust with Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico staged network policies
- Calico `projectcalico.org/v3` API
- Kubernetes NetworkPolicy
- `kubectl`
- Calico flow logs

## Sources Consulted
- Calico staged Kubernetes network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico staged network policy workflow documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico staged network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post described Staged Kubernetes NetworkPolicy but used `kind: NetworkPolicy` with Calico policy fields such as `order`, `selector`, `action`, `source`, `destination`, and `types`. Changed the example to `kind: StagedKubernetesNetworkPolicy` with Kubernetes NetworkPolicy-style `podSelector`, `policyTypes`, `ingress.from`, `egress.to`, and `ports` fields.
- The introduction implied staged policies provide active security controls. Updated the wording to clarify that staged policies preview behavior before enforcement.
- The post claimed staged policy support through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated this to the actual staged resources: `StagedKubernetesNetworkPolicy`, `StagedNetworkPolicy`, and `StagedGlobalNetworkPolicy`.
- The commands used `calicoctl apply` and `calicoctl get networkpolicies` for staged Kubernetes policies. Updated the commands to use `kubectl` and the `stagedkubernetesnetworkpolicy.projectcalico.org` resource names documented by Calico.
- The metrics example used `felix_denied`, which is not the documented staged-policy preview path. Replaced it with a note to inspect staged impact in flow logs, including the `policies.pending` field.
- The architecture diagram showed Felix enforcing the staged policy. Updated it to show preview impact and later enforcement via an enforced NetworkPolicy.
- The troubleshooting and conclusion referenced policy ordering for Staged Kubernetes NetworkPolicy. Removed that claim because Kubernetes NetworkPolicy-style staged policies do not use Calico policy ordering fields.
- The prerequisites specified Calico v3.26+ as a hard version requirement without a source in current Calico documentation. Replaced it with a requirement that the staged policy CRDs be installed.

## Review Notes
The corrected example stages a Kubernetes NetworkPolicy-shaped default-deny-style policy for selected pods. Because staged policies do not enforce traffic, production rollout still requires creating an equivalent enforced Kubernetes `NetworkPolicy` after validating the preview results.
