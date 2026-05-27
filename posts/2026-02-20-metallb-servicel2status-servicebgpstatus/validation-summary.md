# Validation Summary: How to Understand MetalLB ServiceL2Status and ServiceBGPStatus Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- MetalLB
- MetalLB `ServiceL2Status` and `ServiceBGPStatus` CRDs
- BGP
- ARP/NDP Layer 2 advertisement
- jq

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB FAQ, "How can I understand which node advertises a given Service?": https://metallb.universe.tf/faq/
- MetalLB release notes: https://metallb.io/release-notes/
- MetalLB v0.15.2 `ServiceL2Status` CRD schema: https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/crd/bases/metallb.io_servicel2statuses.yaml
- MetalLB v0.15.2 `ServiceBGPStatus` CRD schema: https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/crd/bases/metallb.io_servicebgpstatuses.yaml
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post said MetalLB v0.14 introduced both `ServiceL2Status` and `ServiceBGPStatus`. MetalLB release notes show `ServiceL2Status` was added in v0.14.6 and `ServiceBGPStatus` was added in v0.15.0, so the version statement was corrected.
- The examples placed status resources in the application namespace. MetalLB's official FAQ examples query these resources in `metallb-system`, so examples and health-check commands were updated accordingly.
- The `ServiceL2Status` YAML showed unsupported fields: `spec.serviceName`, `spec.serviceNamespace`, and `status.ips`. The CRD schema exposes `status.node`, `status.serviceName`, `status.serviceNamespace`, and `status.interfaces`, so the YAML was corrected.
- The `ServiceBGPStatus` YAML modeled a nested `status.nodes[].peers[]` structure with `advertised` and `sessionState` fields. The CRD schema exposes one status object per relevant node with `status.node`, `status.serviceName`, `status.serviceNamespace`, and `status.peers`, and explicitly says actual advertisement depends on BGP session state. The YAML and explanatory text were corrected.
- The BGP health-check examples attempted to alert on nonexistent `advertised` and `sessionState` fields. They were replaced with a check for BGP status objects and a peer listing, with a note to use MetalLB BGP metrics, logs, or `BGPSessionState` in FRR-K8s mode for session-state monitoring.
- The lifecycle diagram and bullet list incorrectly tied `ServiceBGPStatus` updates to peer session-state changes. This was changed to advertisement-intent changes.
- The key-field comparison table referenced nonexistent `status.nodes[].peers`; it now references `status.node` and `status.peers`.

## Review Notes
The `kubectl` binary is not installed in this workspace, so commands could not be executed locally. Command syntax was checked against the Kubernetes `kubectl get` reference and MetalLB's documented CRD names, labels, and example queries.
