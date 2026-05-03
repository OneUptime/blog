# Validation Summary: How to Configure Crossplane for IPv6 VPC Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (legacy `crossplane-contrib/provider-aws`, apiVersion `ec2.aws.crossplane.io/v1beta1`)
- Crossplane Compositions and CompositeResourceDefinitions (XRDs), `apiextensions.crossplane.io/v1`
- AWS VPC and Subnet resources with IPv6 (Amazon-provided /56) CIDR blocks
- Kubernetes custom resources / GitOps-style infrastructure

## Sources Consulted
- Crossplane provider-aws CRD for VPC: https://raw.githubusercontent.com/crossplane-contrib/provider-aws/master/package/crds/ec2.aws.crossplane.io_vpcs.yaml
- Crossplane provider-aws CRD for Subnet: https://raw.githubusercontent.com/crossplane-contrib/provider-aws/master/package/crds/ec2.aws.crossplane.io_subnets.yaml
- Crossplane Composition / XRD docs: https://docs.crossplane.io/latest/concepts/compositions/
- doc.crds.dev: https://doc.crds.dev/github.com/crossplane-contrib/provider-aws

## Issues Found
1. VPC `forProvider.enableDnsHostnames` was incorrect. The legacy `provider-aws` CRD spells it `enableDnsHostNames` (capital "N" in `HostNames`). Fixed in the IPv6-Enabled VPC example.
2. Subnet `forProvider.ipv6CidrBlock` was incorrect. The Subnet CRD spells it `ipv6CIDRBlock` (uppercase `CIDR`), which is asymmetric with the VPC field that uses `ipv6CidrBlock`. Fixed in the IPv6 Subnet example.

All other fields verified against the CRDs: `cidrBlock`, `amazonProvidedIpv6CidrBlock`, `enableDnsSupport`, `tags[].key/value`, `region`, `vpcIdRef.name`, `assignIpv6AddressOnCreation`, `availabilityZone`, and the `apiextensions.crossplane.io/v1` Composition / CompositeResourceDefinition shapes.

## Review Notes
- The post uses the **legacy** community provider (`ec2.aws.crossplane.io/v1beta1` from `crossplane-contrib/provider-aws`), which is now in maintenance mode. The modern Upbound-generated family providers use `ec2.aws.upbound.io/v1beta1` (e.g., `provider-aws-ec2`) and have different field naming conventions. Readers starting new projects should consider the family providers; this is informational, not a correctness issue.
- The IPv6 CIDR regex `^[0-9a-fA-F:]+/[0-9]+$` is a permissive shape check, not a strict IPv6-CIDR validator (it accepts strings like `::::/0`). Acceptable for an OpenAPI `pattern` and matches the article's stated intent ("IPv6 CIDR validation").
- The Subnet example sets `ipv6CIDRBlock: ""` with a comment explaining it must be set after the VPC IPv6 CIDR is assigned. In practice, an empty string may be rejected by the API — users typically omit the field or compute and patch it from the VPC's `ipv6CidrBlockAssociationSet`. The author's approach is reasonable as a placeholder pattern.
