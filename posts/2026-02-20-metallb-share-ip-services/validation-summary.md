# Validation Summary: How to Share IP Addresses Between Multiple Services in MetalLB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer Services
- MetalLB
- MetalLB IPAddressPool CRDs
- kubectl
- jq

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB Configuration documentation: https://metallb.io/configuration/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors

## Issues Found
- The post used the older `metallb.universe.tf/allow-shared-ip` annotation. Updated examples and commands to the current `metallb.io/allow-shared-ip` annotation used by MetalLB documentation.
- The post stated that matching sharing keys make services share an IP. MetalLB only says services are eligible to share unless a specific IP is requested, so the wording was changed and deterministic examples now request the same IP with `metallb.io/loadBalancerIPs`.
- The sharing requirements incorrectly mentioned namespace behavior. Replaced that with the documented requirement that services either use `Cluster` external traffic policy or point to the exact same set of pods.
- The post said Kubernetes does not allow mixed protocols in one Service. Current Kubernetes documents mixed-protocol LoadBalancer Services as stable, while provider implementations may still restrict them, so the wording was updated.
- The specific-IP examples used deprecated Kubernetes `spec.loadBalancerIP`. Replaced it with MetalLB's `metallb.io/loadBalancerIPs` annotation.
- The listing command used `--field-selector spec.type=LoadBalancer`, which is not a supported Service field selector. Replaced it with a `kubectl get svc -A -o json | jq` filter.
- The IP pool section implied that only an `IPAddressPool` is needed. Added a note that an L2 or BGP advertisement must announce the pool.

## Review Notes
The post is technically valid after the fixes. The examples assume MetalLB is already installed and has L2 or BGP advertisement configuration for the address pool.
