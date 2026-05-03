# Validation Summary: How to Configure Crossplane Compositions for Dual-Stack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (CompositeResourceDefinitions, Compositions, Patch & Transform)
- AWS provider for Crossplane (`ec2.aws.crossplane.io/v1beta1`: VPC, Subnet)
- Kubernetes CustomResourceDefinitions / OpenAPIv3 schema
- IPv6 / dual-stack networking on AWS VPC

## Sources Consulted
- Crossplane CompositeResourceDefinitions docs: https://docs.crossplane.io/v1.20/concepts/composite-resource-definitions/
- Crossplane Compositions (Patch & Transform) docs: https://docs.crossplane.io/v1.20/concepts/compositions/
- crossplane-contrib/provider-aws VPC CRD: https://github.com/crossplane-contrib/provider-aws/blob/master/package/crds/ec2.aws.crossplane.io_vpcs.yaml
- crossplane-contrib/provider-aws Subnet CRD: https://github.com/crossplane-contrib/provider-aws/blob/master/package/crds/ec2.aws.crossplane.io_subnets.yaml
- AWS docs: VPC Amazon-provided IPv6 CIDR block (/56) and subnet /64 allocation

## Issues Found
1. **VPC field casing wrong**: post used `enableDnsHostnames`. The provider-aws CRD requires `enableDnsHostNames` (capital `N` in `Names`). Verified against the upstream VPC CRD schema. Fixed in `vpc-ipv6.yaml` example.
2. **Subnet IPv6 field casing wrong**: post used `ipv6CidrBlock` for the Subnet. The provider-aws Subnet CRD uses `ipv6CIDRBlock` (capital `CIDR`). Note: this is inconsistent with the VPC's own `ipv6CidrBlock` field — a real footgun in the provider, not in the post — but the post has to match the actual CRD. Fixed in `subnet-ipv6.yaml` example.
3. **XRD missing required version flags**: each entry under `spec.versions` requires `served: true` and `referenceable: true` to be functional. Without them the version is not served and Compositions cannot reference the schema. Added both to the `xrd-dual-stack.yaml` example.

## Review Notes
- The community provider `crossplane-contrib/provider-aws` (the `*.aws.crossplane.io` API group used in the post) is in maintenance mode. Newer projects typically use the Upbound provider family (`*.aws.upbound.io`). The legacy API group is still functional, so the post is correct as written, but readers starting greenfield work should consider the Upbound provider.
- The post uses Composition Patch & Transform (P&T) mode with top-level `spec.resources`. This is valid in Crossplane v1 but is being superseded by Composition Functions / pipeline mode in Crossplane v2. The P&T structure shown (`compositeTypeRef`, `resources[].base`, `patches[].type: FromCompositeFieldPath`) is correct.
- The IPv6 CIDR `pattern` regex `^[0-9a-fA-F:]+/[0-9]+$` is intentionally loose — it accepts any string with hex digits and colons followed by a prefix length. It will accept malformed addresses (e.g. `:::/0`, more than eight groups). Fine as a sanity check but not a real IPv6 validator.
- The composition example does not patch the subnet's `vpcIdRef` from the VPC resource, so applying it as-is would not link the subnet to the VPC. This is consistent with the post's "illustrative" framing but worth flagging as incomplete for production use.
