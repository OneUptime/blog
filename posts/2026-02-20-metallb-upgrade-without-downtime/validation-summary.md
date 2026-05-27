# Validation Summary: How to Upgrade MetalLB to a New Version Without Downtime

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- MetalLB
- Helm
- kubectl
- LoadBalancer Services
- Layer 2 ARP/NDP and BGP service advertisement
- Kubernetes CustomResourceDefinitions

## Sources Consulted
- MetalLB installation and upgrade documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB release notes, including v0.14.9: https://metallb.io/release-notes/
- MetalLB v0.14.9 upstream manifests and chart metadata: https://github.com/metallb/metallb/tree/v0.14.9
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Helm `show crds` command reference: https://helm.sh/docs/helm/helm_show_crds/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/

## Issues Found
- The post said MetalLB IP allocations are stored in Custom Resources. MetalLB configuration is stored in CRs such as `IPAddressPool` and `L2Advertisement`, while assigned LoadBalancer IPs are recorded on Service status. Updated the explanation to distinguish configuration from assigned Service IPs.
- The Helm CRD section stated that MetalLB Helm upgrades may require manual CRD updates because Helm does not upgrade CRDs in a chart `crds/` directory. That is generally true for Helm, but MetalLB's chart is designed to apply CRDs through its chart setup when `crds.enabled` is left enabled. Updated the section to explain the MetalLB-specific behavior and the manual-CRD exception.
- The manual Helm CRD example used `kubectl apply -f metallb/crds/`, but the MetalLB v0.14.9 chart does not expose CRDs at that path after a simple chart pull in the way shown. Replaced it with a command that checks `crds.enabled` and a CRD-only kustomize apply for manual CRD management.
- The manifest upgrade section attempted to `curl` a GitHub directory URL under `config/crd/bases/`, which is not a valid raw file download. Replaced it with `kubectl apply -k "github.com/metallb/metallb/config/crd?ref=${METALLB_VERSION}" --server-side --force-conflicts`.
- The full manifest apply was client-side while the preceding text recommended server-side apply for field ownership conflicts. Updated the full manifest apply command to use the same server-side flags for consistency.

## Review Notes
- The example version `v0.14.9` is valid, but it is not the latest MetalLB release as of this review date. Future readers should still follow the post's advice to review every release note between their current and target versions.
- MetalLB v0.16.0 changed the Helm chart's default BGP backend from FRR mode to FRR-K8s mode, so upgrades across that boundary require extra attention to chart values and release notes.
