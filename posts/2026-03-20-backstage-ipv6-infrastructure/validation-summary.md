# Validation Summary: How to Configure Backstage Scaffolder for IPv6 Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Backstage Scaffolder
- Crossplane
- Kubernetes CompositeResourceDefinitions and Compositions
- AWS VPC and Subnet IPv6 configuration
- OneUptime

## Sources Consulted
- Crossplane Compositions: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Composite Resource Definitions: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane provider-aws VPC API reference: https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/v0.47.1/resources/ec2.aws.crossplane.io/VPC/v1beta1
- Crossplane provider-aws Subnet API reference: https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/v0.50.5/resources/ec2.aws.crossplane.io/Subnet/v1beta1
- AWS VPC CIDR blocks and IPv6 addressing: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS subnet IPv6 CIDR association: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-associate-ipv6-cidr.html
- AWS subnet IPv6 auto-assign behavior: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html
- Backstage software templates: https://backstage.io/docs/features/software-templates/writing-templates

## Issues Found
- The VPC example used `enableDnsHostnames`, but `ec2.aws.crossplane.io/v1beta1` uses `enableDnsHostNames`. I corrected the field name to match the provider schema.
- The Subnet example used `ipv6CidrBlock` and an empty string. I changed it to the provider's `ipv6CIDRBlock` field and replaced the invalid empty value with an example `/64`, because subnet IPv6 auto-assignment requires the subnet to have an associated IPv6 CIDR block.
- The Composition example used the deprecated legacy `spec.resources` composition style. I rewrote it to the current `mode: Pipeline` pattern with Function Patch and Transform, and added the missing VPC selector plus patches for region, availability zone, and subnet IPv6 CIDR.
- The XRD example omitted `served: true` and `referenceable: true`, which are required for a version to be usable by Compositions. I added those fields and aligned the schema with the fields consumed by the Composition.
- The post metadata and overview claimed Terraform coverage that the article did not actually include. I narrowed the description and overview to the Crossplane-backed scaffolder flow shown in the post and replaced the unrelated `IdP` tag with `Crossplane`.

## Review Notes
- The post now accurately frames the Crossplane side of a Backstage scaffolder workflow, but it still does not include a literal Backstage `Template` manifest or a Terraform example.
- The `ipv6CIDR` regex in the XRD is only a basic format check. Strict IPv6 CIDR validation would require a tighter schema or admission-time validation.
