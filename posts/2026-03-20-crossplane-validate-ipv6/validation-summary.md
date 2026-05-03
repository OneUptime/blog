# Validation Summary: How to Validate Crossplane IPv6 Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (apiextensions.crossplane.io/v1)
- Crossplane AWS provider (legacy `crossplane-contrib/provider-aws`, `ec2.aws.crossplane.io/v1beta1`)
- Kubernetes Custom Resource Definitions (CRDs) and OpenAPI v3 schema
- AWS VPC and Subnet IPv6 (Amazon-provided IPv6 CIDR blocks, dual-stack networking)
- Crossplane Compositions and CompositeResourceDefinitions (XRDs)

## Sources Consulted
- crossplane-contrib/provider-aws VPC types (master): https://raw.githubusercontent.com/crossplane-contrib/provider-aws/master/apis/ec2/v1beta1/vpc_types.go
- crossplane-contrib/provider-aws Subnet types (master): https://raw.githubusercontent.com/crossplane-contrib/provider-aws/master/apis/ec2/v1beta1/subnet_types.go
- Crossplane Compositions docs (v1.20): https://docs.crossplane.io/v1.20/concepts/compositions/
- Crossplane Patch and Transform (function-patch-and-transform) docs: https://docs.crossplane.io/latest/guides/function-patch-and-transform/

## Issues Found
1. **VPC `enableDnsHostnames` field name was wrong.** The actual JSON tag in the `crossplane-contrib/provider-aws` VPC type is `enableDnsHostNames` (capital `N` in `Names`). Changed `enableDnsHostnames: true` → `enableDnsHostNames: true`. Submitting the original would have left DNS hostnames un-set on the VPC because Kubernetes would silently drop the unknown field when validation isn't strict, or reject it under strict CRD validation.
2. **Subnet `ipv6CidrBlock` field name was wrong.** Note an inconsistency in the upstream Go types: VPC uses JSON tag `ipv6CidrBlock`, but Subnet uses `ipv6CIDRBlock` (uppercase `CIDR`). Changed the Subnet example's `ipv6CidrBlock: ""` → `ipv6CIDRBlock: ""`. The VPC usage of `ipv6CidrBlock` was already correct.

## Review Notes
- The post's title and description promise validation via "composition functions, webhooks, and policy tools," but the body only demonstrates basic OpenAPI v3 `pattern` validation in an XRD. Composition functions, validating webhooks, and policy tools (Kyverno/OPA Gatekeeper) are not actually shown. This is a content/scope gap rather than a technical inaccuracy, so no edits were made.
- The Composition shown uses the legacy patch-and-transform (P&T) `resources:` array, which is still supported in Crossplane 1.x but is deprecated in newer releases in favor of pipeline mode with the `function-patch-and-transform` composition function. Anyone adopting this pattern fresh on a recent Crossplane version should consider pipeline mode.
- The `ipv6CIDR` regex `^[0-9a-fA-F:]+/[0-9]+$` is overly permissive — it would, for example, accept `1234/56` with no colons required and no upper bound on the prefix length. It is technically a valid pattern, just weak; a stricter pattern would be more useful in production.
- The legacy `crossplane-contrib/provider-aws` is in maintenance mode; new projects typically use `provider-upjet-aws` (`ec2.aws.upbound.io/v1beta1`), which has different field names and structure. The post does not call out which provider it targets.
