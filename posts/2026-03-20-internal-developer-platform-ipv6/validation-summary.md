# Validation Summary: How to Build Internal Developer Platforms with IPv6 Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Crossplane
- Upbound AWS EC2 provider for Crossplane
- Kubernetes CompositeResourceDefinitions and Compositions
- AWS VPC and Subnet IPv6 networking
- OneUptime

## Sources Consulted
- Crossplane Compositions: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Managed Resources: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane Composite Resource Definitions: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Upbound Marketplace VPC reference: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.5.3/resources/ec2.aws.m.upbound.io/VPC/v1beta1
- Upbound Marketplace Subnet reference: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.5.3/resources/ec2.aws.m.upbound.io/Subnet/v1beta1
- AWS VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS::EC2::Subnet reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html

## Issues Found
- The post used the legacy managed resource API group `ec2.aws.crossplane.io/v1beta1`. Updated the examples to the current Upbound AWS EC2 provider group `ec2.aws.m.upbound.io/v1beta1`.
- The VPC example used the old field `amazonProvidedIpv6CidrBlock` and a tag list format that do not match the current provider schema. Updated it to `assignGeneratedIpv6CidrBlock` and map-style `tags`.
- The standalone managed resource examples referenced `providerConfigRef` without a `kind`. Added `kind: ClusterProviderConfig` to match current Crossplane provider config references.
- The subnet example paired `assignIpv6AddressOnCreation: true` with an empty `ipv6CidrBlock`, which is not a valid dual-stack subnet configuration. Replaced it with a concrete `/64` example and clarified that the value must come from the VPC's IPv6 allocation.
- The Composition example used the legacy `spec.resources` patch-and-transform style, which is deprecated in current Crossplane. Rewrote it as a `mode: Pipeline` Composition using `function-patch-and-transform`.
- The Composition subnet did not correctly reference the composed VPC. Updated it to use `vpcIdSelector.matchControllerRef: true`, which is the current Crossplane pattern for relating composed resources from the same XR.
- The XRD example was incomplete for current Crossplane. Updated it to `apiextensions.crossplane.io/v2`, added `scope`, `served`, `referenceable`, and required fields, and clarified that the regex is only a basic IPv6 CIDR format check.

## Review Notes
- The corrected subnet IPv6 examples still assume the subnet receives a `/64` drawn from the VPC's IPv6 space. If a platform needs to derive subnet IPv6 ranges automatically from Amazon-generated VPC IPv6 allocations, it will need additional composition logic or IPAM-backed allocation.
