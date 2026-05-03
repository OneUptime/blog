# Validation Summary: How to Monitor Crossplane-Managed IPv6 Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (Composition, CompositeResourceDefinition / XRD)
- Crossplane AWS provider (classic `crossplane-contrib/provider-aws`, API group `ec2.aws.crossplane.io/v1beta1`)
- AWS EC2 VPC and Subnet (IPv6 / dual-stack networking)
- Kubernetes custom resources / OpenAPI v3 schema validation
- IPv6 CIDR addressing

## Sources Consulted
- Crossplane documentation: https://docs.crossplane.io/
- Crossplane Composition reference: https://docs.crossplane.io/latest/concepts/compositions/
- Crossplane CompositeResourceDefinition reference: https://docs.crossplane.io/latest/concepts/composite-resource-definitions/
- crossplane-contrib/provider-aws (classic AWS provider) VPC/Subnet types: https://github.com/crossplane-contrib/provider-aws
- AWS EC2 API reference (CreateVpc / CreateSubnet parameters): https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVpc.html, https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateSubnet.html
- AWS VPC IPv6 documentation (Amazon-provided /56 IPv6 CIDR blocks, /64 subnet allocation): https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html

## Issues Found
No technical issues found.

The Crossplane resource definitions are accurate:
- `apiVersion: ec2.aws.crossplane.io/v1beta1` is the correct API group for the classic `crossplane-contrib/provider-aws` VPC and Subnet types.
- Field names (`amazonProvidedIpv6CidrBlock`, `cidrBlock`, `enableDnsHostnames`, `enableDnsSupport`, `vpcIdRef`, `assignIpv6AddressOnCreation`, `ipv6CidrBlock`, `availabilityZone`, `tags`) match the provider's spec and the underlying AWS EC2 API parameters.
- `apiVersion: apiextensions.crossplane.io/v1` is correct for both `Composition` and `CompositeResourceDefinition`.
- The Composition `resources` / P&T (Patch & Transform) format with `FromCompositeFieldPath` is valid.
- The XRD `openAPIV3Schema` structure is valid; the IPv6 CIDR regex `^[0-9a-fA-F:]+/[0-9]+$` is loose but technically correct (it will accept all valid IPv6 CIDRs).
- The comment about VPCs receiving a `/56` IPv6 block from AWS and subnets being assigned `/64` from it is accurate.

## Review Notes
- The post title and tags (Prometheus, Monitoring, Observability) suggest a monitoring tutorial, but the actual content is overwhelmingly about *defining* IPv6-enabled infrastructure with Crossplane. The "Monitoring with OneUptime" section is a single paragraph and Prometheus is not actually demonstrated. This is a content/scope concern rather than a technical inaccuracy, so no edits were made.
- The Composition uses the legacy "Resources" (Patch & Transform) mode. As of Crossplane v1.17+, the recommended approach is Composition Functions (`mode: Pipeline`). The legacy mode is still supported but is being phased out — readers using newer Crossplane installations may want to consider the Pipeline / Functions approach in the future.
- The classic `crossplane-contrib/provider-aws` is in maintenance mode; the Upbound family providers (e.g. `provider-aws-ec2`, API group `ec2.aws.upbound.io/v1beta1`) are now the recommended path forward. The classic provider still works and the YAML in this post is valid for it, but this is worth noting for new installations.
- The Subnet example sets `ipv6CidrBlock: ""` with a comment indicating it must be set after the VPC's IPv6 CIDR is assigned — in practice this typically requires either a manual second pass, a Composition that derives the value with patches, or use of the Upbound provider's `ipv6CidrBlock` lookup helpers. The example is correct but a reader copy-pasting it as-is will need to fill in the value.
