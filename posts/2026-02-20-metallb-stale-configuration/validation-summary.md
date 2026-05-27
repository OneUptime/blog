# Validation Summary: How to Fix MetalLB Stale Configuration After Pool Changes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- MetalLB BGPAdvertisement
- Kubernetes LoadBalancer Services

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB installation documentation: https://metallb.io/installation/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- kubectl rollout documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- kubectl patch documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The introduction and cause table implied stale state mainly comes from rapid changes or missed intermediate controller events. MetalLB documents stale configuration as expected behavior when a configuration is invalid or would disrupt existing service assignments, so the wording was corrected.
- The re-apply workflow exported live Kubernetes resources and then applied those same exports after deletion. Live exports commonly include server-managed metadata and are safer as backups or references, not clean declarative manifests. The post now instructs readers to re-apply clean manifests from source control.
- The service cleanup command used the deprecated `metallb.universe.tf/address-pool` annotation prefix. MetalLB currently recommends `metallb.io/address-pool`, so the annotation was updated.
- The service cleanup section only removed `spec.loadBalancerIP`, which is deprecated in Kubernetes and does not cover MetalLB's current `metallb.io/loadBalancerIPs` annotation. The post now clears both explicit IP and pool annotations and uses a merge patch that is safer when `loadBalancerIP` is absent.
- The stale service cleanup section implied removing `loadBalancerIP` alone would force reallocation. MetalLB documents restarting the controller or deleting and recreating the Service as reallocation paths when stale state preserves connectivity, so the example now recreates the Service from its manifest.

## Review Notes
The command examples are generally valid for current Kubernetes and MetalLB installations that use the standard `metallb-system` namespace and `controller`/`speaker` workload names. Helm or operator-based installs may use different labels or namespaces, so readers may need to adjust selectors in those environments.
