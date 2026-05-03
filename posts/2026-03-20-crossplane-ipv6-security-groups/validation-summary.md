# Validation Summary: How to Configure Crossplane for IPv6 Security Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (apiextensions.crossplane.io/v1)
- crossplane-contrib/provider-aws (legacy AWS provider, ec2.aws.crossplane.io/v1beta1)
- AWS VPC and Subnet (with IPv6 CIDR blocks)
- Crossplane Compositions and CompositeResourceDefinitions (XRDs)
- Kubernetes custom resources / OpenAPI v3 schema validation

## Sources Consulted
- crossplane-contrib/provider-aws VPC types: https://github.com/crossplane-contrib/provider-aws/blob/master/apis/ec2/v1beta1/vpc_types.go
- crossplane-contrib/provider-aws Subnet types: https://github.com/crossplane-contrib/provider-aws/blob/master/apis/ec2/v1beta1/subnet_types.go
- crossplane-contrib/provider-aws SecurityGroup types: https://github.com/crossplane-contrib/provider-aws/blob/master/apis/ec2/v1beta1/securitygroup_types.go
- Crossplane Composition / XRD reference: https://docs.crossplane.io/latest/concepts/compositions/

## Issues Found
1. **VPC field name typo**: `enableDnsHostnames` (lowercase `n`) was used in the VPC example. The provider-aws v1beta1 VPC CRD defines this field as `enableDnsHostNames` (capital `N`, derived from the Go field `EnableDNSHostNames`). Corrected to `enableDnsHostNames`.
2. **Subnet field name typo**: `ipv6CidrBlock` (camelCase) was used in the Subnet example. The provider-aws v1beta1 Subnet CRD defines this field as `ipv6CIDRBlock` (capital `CIDR`, derived from `IPv6CIDRBlock`). Corrected to `ipv6CIDRBlock`. Note: this casing is inconsistent within the same apiVersion — VPC uses `amazonProvidedIpv6CidrBlock` while Subnet uses `ipv6CIDRBlock` — but both are correct per the upstream schema.

## Review Notes
- **Title/content mismatch**: The post is titled "How to Configure Crossplane for IPv6 Security Groups" and the description promises "cloud security groups with IPv6 ingress and egress rules", but the body contains only VPC and Subnet examples and does not show a `SecurityGroup` resource at all. A future revision should add a `SecurityGroup` example using `ipv6Ranges` with `cidrIPv6` (e.g., `::/0`) for ingress/egress. I did not add this content during validation because the review scope was limited to fixing technical errors, not restructuring or adding new sections.
- The legacy crossplane-contrib `provider-aws` is in maintenance mode; new work typically uses the Upbound family providers (`provider-family-aws` / `provider-aws-ec2` at `ec2.aws.upbound.io/v1beta1`), where field names differ (e.g., `ipv6CidrBlock` lowercase, `enableDnsHostnames` lowercase). This post targets the legacy provider — the field names after correction match that provider's schema.
- The XRD `pattern: '^[0-9a-fA-F:]+/[0-9]+$'` for `ipv6CIDR` is a permissive validator and would accept some non-canonical IPv6 strings; it is not strictly wrong but a stricter regex would be preferable.
- The `cidrBlock: 10.0.0.0/16` for VPC and `cidrBlock: 10.0.1.0/24` for Subnet are required even on a dual-stack VPC; AWS does not support IPv6-only VPCs at the VPC level, so the IPv4 CIDR must be set. This is correctly shown.
