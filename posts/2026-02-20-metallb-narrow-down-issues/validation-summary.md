# Validation Summary: How to Narrow Down MetalLB Issues by Limiting Nodes and Endpoints

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services and Deployments
- kubectl
- MetalLB Layer 2 advertisements
- MetalLB IPAddressPool resources
- MetalLB BGP resources
- Kubernetes Service traffic policy

## Sources Consulted
- MetalLB configuration docs: https://metallb.io/configuration/
- MetalLB advanced L2 configuration docs: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB advanced IPAddressPool configuration docs: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage docs: https://metallb.io/usage/
- MetalLB troubleshooting docs: https://metallb.io/troubleshooting/
- Kubernetes field selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Service docs: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes pod node assignment docs: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The LoadBalancer service capture command used `--field-selector type=LoadBalancer`, but Kubernetes Service field selectors use `spec.type`. Changed it to `--field-selector spec.type=LoadBalancer`.
- The L2Advertisement example used `debug-pool` before the debug IPAddressPool was introduced, which could make the early single-node test ineffective. Changed the example pool name to `production-pool` to indicate the existing pool under test.
- The text said applying the debug L2Advertisement replaces existing L2Advertisements. MetalLB combines matching L2Advertisements, so existing advertisements can still make other nodes eligible. Updated the comment to tell readers to disable or narrow other matching advertisements during the test.
- The speaker log command used `kubectl logs --field-selector spec.nodeName=...`, but `kubectl logs` supports label selectors, not field selectors. Replaced it with a valid two-step command that selects the speaker pod with `kubectl get pods --field-selector spec.nodeName=...` and then reads that pod's logs.
- The cross-node endpoint test removed `nodeName` from the Deployment template but did not recreate existing pods, so already-running pods would not move. Added `kubectl rollout restart`, rollout status, and a wide pod listing to recreate and verify pod placement.
- The debug IP pool step recreated the Service without forcing it to use `debug-pool`, so MetalLB could still allocate from another auto-assignable pool. Added an instruction to annotate the Service with `metallb.io/address-pool: debug-pool` before recreating it.

## Review Notes
- `BGPPeer` currently has a served `v1beta2` API in recent MetalLB releases while `v1beta1` is deprecated in the official manifest, but the post only retrieves existing `bgppeer` resources and does not define a new `BGPPeer` object. No change was required.
- `nodeName` is valid for forcing a pod onto a node during debugging, but Kubernetes documentation notes that it bypasses the scheduler and can fail if the node is missing or lacks capacity.
