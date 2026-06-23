# Validation Summary: How to Request Static IPs for Services in MetalLB

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MetalLB
- Kubernetes Services of type LoadBalancer
- Kubernetes Service dual-stack configuration
- MetalLB IPAddressPool and L2Advertisement resources
- ExternalDNS
- CoreDNS
- kubectl

## Sources Consulted
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes CoreDNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/

## Issues Found
- Updated MetalLB service annotations from the legacy `metallb.universe.tf/*` prefix to the current `metallb.io/*` prefix used by official MetalLB documentation.
- Added the Kubernetes v1.24 deprecation caveat for `spec.loadBalancerIP` and clarified that MetalLB annotations are preferred for dual-stack requests.
- Corrected the first IPAddressPool example comment: `autoAssign: true` allows automatic allocation, it does not prevent it.
- Corrected IP sharing rules. MetalLB requires the same sharing key, non-conflicting protocol/port tuples, and compatible `externalTrafficPolicy` or identical pod selectors; it does not require all shared services to use the same protocol.
- Renamed the "Priority-Based Pool Selection" strategy to "Advertisement-Based Pool Selection" because the provided L2Advertisement example controls announcement scope, not allocation priority.
- Corrected namespace-based allocation guidance to use MetalLB `serviceAllocation.namespaces`, since current MetalLB does support namespace and service selectors on IPAddressPool resources.
- Updated the ExternalDNS example image from `v0.14.0` to `v0.20.0` to align with current ExternalDNS chart documentation.
- Replaced the generic `coredns-custom` ConfigMap example with a CoreDNS `Corefile` hosts-plugin example, because unmanaged `coredns-custom` keys are provider-specific unless imported by the active CoreDNS configuration.
- Corrected troubleshooting guidance to check MetalLB controller logs for IP allocation failures; speakers are responsible for advertisement after allocation.
- Fixed the IP sharing troubleshooting code fence from YAML to Bash and updated its annotation prefix.
- Fixed the production example so both services sharing `10.0.50.1` use the same MetalLB sharing key.
- Updated MetalLB resource links to the current `metallb.io` documentation domain.

## Review Notes
- The ExternalDNS deployment remains illustrative and assumes the referenced ServiceAccount, RBAC, and provider credentials are created appropriately for the target cluster and DNS provider.
- The dual-stack Service example assumes matching IPv4 and IPv6 MetalLB address pools exist.
