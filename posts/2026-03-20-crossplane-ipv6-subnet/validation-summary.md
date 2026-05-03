# Validation Summary: How to Configure Crossplane for IPv6 Subnet Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (apiextensions.crossplane.io/v1)
- crossplane-contrib/provider-aws (ec2.aws.crossplane.io/v1beta1)
- AWS VPC and Subnet IPv6 networking
- Composite Resource Definitions (XRDs) and Compositions
- Kubernetes custom resources / OpenAPI v3 schemas

## Sources Consulted
- [provider-aws VPC types source (vpc_types.go)](https://github.com/crossplane-contrib/provider-aws/blob/master/apis/ec2/v1beta1/vpc_types.go)
- [provider-aws Subnet types source (subnet_types.go)](https://github.com/crossplane-contrib/provider-aws/blob/master/apis/ec2/v1beta1/subnet_types.go)
- [provider-aws VPC CRD YAML](https://github.com/crossplane-contrib/provider-aws/blob/master/package/crds/ec2.aws.crossplane.io_vpcs.yaml)
- [provider-aws Subnet CRD YAML](https://github.com/crossplane-contrib/provider-aws/blob/master/package/crds/ec2.aws.crossplane.io_subnets.yaml)
- [Crossplane Composite Resource Definitions docs](https://docs.crossplane.io/latest/composition/composite-resource-definitions/)
- [Crossplane Compositions docs](https://docs.crossplane.io/latest/composition/compositions/)
- [VPC resource on Upbound Marketplace (v0.47.1)](https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/v0.47.1/resources/ec2.aws.crossplane.io/VPC/v1beta1)

## Issues Found

1. **Incorrect VPC field casing: `enableDnsHostnames` → `enableDnsHostNames`.**
   The legacy `crossplane-contrib/provider-aws` v1beta1 VPC CRD declares the JSON field as `enableDnsHostNames` (capital `N` in `Names`, mirroring the Go field `EnableDNSHostNames`). The post used the lowercase variant which the CRD's OpenAPI schema would reject. Fixed in the IPv6-Enabled VPC example.

2. **Incorrect Subnet field casing: `ipv6CidrBlock` → `ipv6CIDRBlock`.**
   Unlike the VPC resource (which uses `ipv6CidrBlock`), the Subnet v1beta1 CRD spec uses `ipv6CIDRBlock` (capital `CIDR`). This inconsistency between the two resource kinds is real in the upstream provider. Fixed in the IPv6 Subnet example.

3. **XRD `versions` entry missing `served: true` and `referenceable: true`.**
   Crossplane requires at least one XRD version to be marked as both `served` and `referenceable` for the XRD to be served via the Kubernetes API and selectable by Compositions. The post's XRD example only set `name` and `schema`. Added both flags to the v1alpha1 entry so the XRD is functional as written.

## Review Notes

- **Provider deprecation:** The `crossplane-contrib/provider-aws` (native) provider used in the examples has been superseded by the Upbound `provider-aws` family (upjet-generated, e.g. `ec2.aws.upbound.io/v1beta1`). The native provider still works for the fields shown, but new readers may want to know that the upjet/Upbound providers are the actively maintained path going forward. No code change made because the examples are internally consistent and valid for the native provider.
- **Composition `mode` not specified:** The Composition uses the legacy patch-and-transform style with a top-level `resources:` array and no `mode:` field. In Crossplane v1.17+ the default mode shifted to `Pipeline`, and in Crossplane v2.0+ the legacy `Resources` mode was removed entirely — Compositions there must use `mode: Pipeline` with a `pipeline:` of composition functions (e.g. `function-patch-and-transform`). Readers running Crossplane v2 will need to wrap the example resources inside a pipeline step; the post does not call this out.
- **GCP listed in tags but not covered:** The post tags include `GCP` but only AWS examples are shown. Not a technical error, just a tagging mismatch.
- **Subnet `ipv6CIDRBlock: ""`:** Setting an empty string is functionally equivalent to omitting the field; the comment in the post explains the intent (let the user populate after the VPC is provisioned). Acceptable as an illustrative placeholder.
- **`vpcIdRef` cross-resource reference:** Correct usage — the v1beta1 Subnet type defines `vpcIdRef` as a Crossplane reference object that resolves to the VPC's external name.
