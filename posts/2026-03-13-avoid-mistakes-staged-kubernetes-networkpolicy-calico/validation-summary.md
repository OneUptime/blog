# Validation Summary: Common Mistakes to Avoid with Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico staged network policy
- Kubernetes NetworkPolicy
- StagedKubernetesNetworkPolicy CRD
- kubectl
- Calico flow logs

## Sources Consulted
- Calico staged Kubernetes network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico stage, preview, and enforce policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico staged network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post described Staged Kubernetes NetworkPolicy but used Calico `NetworkPolicy` with Calico-specific fields such as `order`, `selector`, `action`, `source`, `destination`, and `types`. I changed the example to `kind: StagedKubernetesNetworkPolicy` with Kubernetes NetworkPolicy-shaped fields: `podSelector`, `ingress.from`, `egress.to`, `ports`, and `policyTypes`.
- The introduction incorrectly said staged Kubernetes NetworkPolicy support came through `GlobalNetworkPolicy` and `NetworkPolicy`. I corrected it to reference `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`.
- The prerequisites repeated an unsupported version-specific claim and required `calicoctl`. I replaced that with a requirement for a Calico cluster that has the `StagedKubernetesNetworkPolicy` CRD installed, `kubectl`, and permissions for staged policy resources.
- The implementation and operations sections used `calicoctl` for staged policy resources, but Calico's staged policy documentation uses Kubernetes custom resources with `kubectl`, and the current `calicoctl` reference does not list staged resources as valid resource types. I changed the commands to use `kubectl` with the `projectcalico.org` resource names.
- The post implied staged policies are enforced and suggested checking Felix denied metrics. I changed the wording and architecture diagram to describe preview behavior and to point to Calico flow logs' `policies.pending` field when flow logs are enabled.
- The troubleshooting section referenced Calico policy ordering for Kubernetes NetworkPolicy. I changed it to note that Kubernetes NetworkPolicy rules are additive and that overlapping policies selecting the same pods should be reviewed.
- The DNS guidance only allowed UDP port 53. I updated it to include both TCP and UDP port 53 for DNS egress.

## Review Notes
The corrected post focuses on the Kubernetes NetworkPolicy-shaped staged resource. Calico also has `StagedNetworkPolicy` and `StagedGlobalNetworkPolicy` resources with Calico policy fields, but those are different resources from `StagedKubernetesNetworkPolicy`.
