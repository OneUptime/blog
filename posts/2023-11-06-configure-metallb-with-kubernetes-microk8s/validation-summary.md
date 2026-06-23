# Validation Summary: How to configure MetalLB with Kubernetes (Microk8s).

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB (bare-metal Kubernetes load balancer)
- MicroK8s
- Kubernetes (Service, LoadBalancer type, IPAddressPool CRD)
- kubectl

## Sources Consulted
- MetalLB official usage documentation — https://metallb.io/usage/
- MetalLB configuration / IPAddressPool docs — https://metallb.io/configuration/
- MetalLB annotation deprecation reference (GitHub issue #2642) — https://github.com/metallb/metallb/issues/2642
- MicroK8s MetalLB addon documentation — https://canonical.com/microk8s/docs/addon-metallb

## Issues Found
No technical issues found.

The post's most notable claim — that the service annotation prefix `metallb.universe.tf` is deprecated and `metallb.io/address-pool` should be used instead — was independently verified and is **correct**. Current MetalLB documentation uses the `metallb.io/address-pool` annotation, and the older `metallb.universe.tf`-prefixed annotations are deprecated.

Other verified items:
- `microk8s enable metallb` is the correct addon command. When no IP range is supplied it prompts interactively for an address pool (an optional `microk8s enable metallb:<range>` form also exists), so the command as written works.
- The `IPAddressPool` resource uses the correct `apiVersion: metallb.io/v1beta1`, `kind: IPAddressPool`, and the `metallb-system` namespace.
- The `kubectl apply -f address-pool.yaml` command and the Service YAML (LoadBalancer type, ports, selector, annotation) are syntactically valid and accurate.

## Review Notes
- **L2Advertisement (caveat, not an error):** In a vanilla MetalLB install, an `IPAddressPool` alone does not cause IPs to be advertised in L2 mode — an `L2Advertisement` (or `BGPAdvertisement`) resource is also required. In the MicroK8s context this post targets, enabling the `metallb` addon automatically creates a default `L2Advertisement` that selects all pools, so the manually-created pool here is advertised without extra steps. A future revision could briefly mention the L2Advertisement concept for readers who later move off the MicroK8s addon.
- **`spec.loadBalancerIP` (caveat):** The commented-out `loadBalancerIP: a.b.c.d` field uses `spec.loadBalancerIP`, which has been deprecated in upstream Kubernetes since v1.24. It still functions, but MetalLB's recommended modern equivalent is the `metallb.io/loadBalancerIPs` annotation. Since the line is only an optional, commented-out hint, this is left as-is.
