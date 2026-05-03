# Validation Summary: How to Handle IPv6 in Crossplane XRDs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane (apiextensions.crossplane.io/v1)
- Crossplane CompositeResourceDefinitions (XRDs)
- Crossplane Compositions
- Upbound AWS provider (ec2.aws.upbound.io/v1beta1) — VPC and Subnet managed resources
- AWS IPv6 networking (dual-stack VPC/Subnet)
- Kubernetes OpenAPI v3 schema validation

## Sources Consulted
- Crossplane CRD schema for CompositeResourceDefinition: https://github.com/crossplane/crossplane/blob/main/cluster/crds/apiextensions.crossplane.io_compositeresourcedefinitions.yaml
- Upbound provider-upjet-aws VPC CRD: https://github.com/crossplane-contrib/provider-upjet-aws/blob/main/package/crds/ec2.aws.upbound.io_vpcs.yaml
- Upbound provider-upjet-aws Subnet CRD: https://github.com/crossplane-contrib/provider-upjet-aws/blob/main/package/crds/ec2.aws.upbound.io_subnets.yaml
- Upbound Marketplace docs: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/

## Issues Found

1. **Deprecated provider apiVersion.** All VPC and Subnet examples used `ec2.aws.crossplane.io/v1beta1` (legacy `crossplane-contrib/provider-aws`, now archived). The legacy provider's VPC/Subnet schemas also do not expose `amazonProvidedIpv6CidrBlock`, `ipv6CidrBlock`, or `assignIpv6AddressOnCreation`, so the examples could not work as written. **Fix:** changed apiVersion to `ec2.aws.upbound.io/v1beta1` (Upbound provider-aws-ec2) in all three code blocks (VPC, Subnet, Composition).

2. **Wrong VPC IPv6 field name.** The post used `amazonProvidedIpv6CidrBlock: true`, but the Upbound provider's VPC CRD exposes the field as `assignGeneratedIpv6CidrBlock` (camelCase of Terraform's `assign_generated_ipv6_cidr_block`). **Fix:** renamed in both the VPC example and the Composition base.

3. **Wrong tags format.** The VPC example used the legacy list-of-objects tag format (`- key: ... value: ...`). The Upbound provider's `tags` field is a map (`additionalProperties: string`). **Fix:** rewrote `tags` as a YAML map.

4. **Missing required XRD fields.** The XRD `spec.versions[]` entry omitted `served` and `referenceable`, both of which are required by the CompositeResourceDefinition CRD schema. The XRD would have been rejected by the API server. **Fix:** added `served: true` and `referenceable: true` to the `v1alpha1` version block.

## Review Notes
- The post's title and description mention "CEL validation for IPv6 format enforcement," but the XRD example uses an OpenAPI `pattern` regex rather than a CEL `x-kubernetes-validations` rule. The regex `^[0-9a-fA-F:]+/[0-9]+$` is a permissive sanity check (it accepts strings like `:::/0`), not a strict IPv6 CIDR validator. Left as-is since it is technically valid OpenAPI v3 schema and matches the author's intent of "basic format check," but a future revision could either tighten the regex or add a CEL rule to match the post's framing.
- The `enableIPv6` and `ipv6CIDR` properties in the XRD are illustrative — the Composition shown does not actually patch these to the underlying VPC/Subnet resources. The post does not claim it does, so this is fine as a structural example.
- The Subnet's `ipv6CidrBlock: ""` placeholder relies on a follow-up step the post does not show; in practice users will patch this from the VPC's assigned `/56` via a `FromCompositeFieldPath` patch chain or a function pipeline. Acceptable for a guide-level example.
