# Validation Summary: How to Use CIDR and Range Notation for MetalLB IPAddressPools

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- MetalLB
- IPAddressPool custom resources
- CIDR notation
- IPv4 and IPv6 address ranges
- kubectl

## Sources Consulted
- MetalLB API reference for `IPAddressPoolSpec`: https://metallb.io/apis/
- MetalLB configuration docs for `IPAddressPool` address formats: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration docs for single-IP `/32` notation and `avoidBuggyIPs`: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB source code for `IPAddressPoolSpec` and address range parsing: https://github.com/metallb/metallb/blob/main/api/v1beta1/ipaddresspool_types.go and https://github.com/metallb/metallb/blob/main/internal/config/config.go
- MetalLB allocator source for `avoidBuggyIPs` behavior: https://github.com/metallb/metallb/blob/main/internal/allocator/allocator.go

## Issues Found
- The post stated that explicit range endpoints must be in the same subnet. MetalLB's API describes explicit start-end ranges, and the parser validates the start and end IPs plus their ordering rather than enforcing a subnet boundary. I changed this to say both endpoints must parse as valid IP addresses.
- The common mistakes table treated a range spanning different IPv4 subnets as invalid. Since MetalLB can parse start-end ranges that cross subnet boundaries, I replaced that row with a start-after-end range example, which MetalLB rejects.
- The CIDR section said MetalLB uses every address in the CIDR block, including `.0` and `.255`, without noting the `avoidBuggyIPs` option. I clarified that this is the default behavior and that `avoidBuggyIPs` skips IPv4 addresses ending in `.0` and `.255`.

## Review Notes
The YAML examples use the current `metallb.io/v1beta1` `IPAddressPool` resource and valid `spec.addresses` syntax. The `kubectl get` and `kubectl logs` commands are syntactically valid, though label selectors for MetalLB pods can vary by installation method.
