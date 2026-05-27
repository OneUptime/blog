# Validation Summary: How to Avoid Buggy IPs (.0 and .255) in MetalLB Address Pools

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- MetalLB
- IPv4 CIDR addressing and subnetting
- IPv6 addressing
- kubectl JSONPath

## Sources Consulted
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Advanced AddressPool configuration documentation: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB API reference: https://metallb.io/apis/index.html
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- RFC 1878, Variable Length Subnet Table For IPv4: https://www.rfc-editor.org/rfc/rfc1878
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The post incorrectly used `10.0.1.0/28` as an example where all 16 addresses were usable. In a normal IPv4 `/28`, the first address is the network address and the last address is the broadcast address. I changed the example to `10.0.0.0/23`, where `10.0.1.0` is a valid host address.
- The subnet-size section incorrectly described `/28` and `/30` examples as fully usable or "usually safe." I updated the examples and table to reflect that ordinary IPv4 subnets reserve the first and last addresses, and that `.0` and `.255` depend on subnet alignment.
- The post omitted MetalLB's official `avoidBuggyIPs` option. I added it as the primary MetalLB-specific solution and kept the explicit range examples as alternatives.
- The migration command used `kubectl get svc -A -o wide | grep -E '\.0 |\.255 '`, which can miss matches depending on column formatting. I replaced it with the JSONPath-based LoadBalancer IP check already used elsewhere in the post.
- The IPv6 section said all-zeros host-part network addresses are reserved. I revised this to mention IPv6 subnet-router anycast while clarifying that IPv6 does not use IPv4's `.0`/`.255` convention.

## Review Notes
The MetalLB `IPAddressPool` examples use the current `metallb.io/v1beta1` API shape and valid `spec.addresses` formats. The `kubectl` JSONPath commands use documented Kubernetes JSONPath syntax.
