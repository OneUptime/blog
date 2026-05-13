# Validation Summary: How to Handle Crossplane Resource Dependencies in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Crossplane managed resources
- Upbound AWS providers for EC2 and RDS
- Kubernetes custom resources
- GitOps dependency ordering

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane v2 managed resource changes: https://docs.crossplane.io/latest/whats-new/
- Crossplane v2 upgrade guide: https://docs.crossplane.io/v2.0/guides/upgrade-to-crossplane-v2/
- Crossplane provider configuration documentation: https://docs.crossplane.io/latest/packages/providers/
- Upbound provider-aws-rds Instance API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.2/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound provider-aws-rds SubnetGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.2/resources/rds.aws.m.upbound.io/SubnetGroup/v1beta1
- Upbound provider-aws-ec2 managed resources listing: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v2.5.3?tab=managedResources

## Issues Found
- The post used legacy cluster-scoped Upbound AWS API groups such as `rds.aws.upbound.io` and `ec2.aws.upbound.io`. Updated examples to the current namespaced groups `rds.aws.m.upbound.io` and `ec2.aws.m.upbound.io`, and added `metadata.namespace` plus namespaced health check references.
- The Crossplane v2 AWS managed resource examples omitted the required `providerConfigRef.kind` field when `providerConfigRef` is present. Added `kind: ClusterProviderConfig`.
- The RDS `Instance` selector example used `subnetIdSelector`, which is not a valid field on `Instance`. Replaced the example with a `SubnetGroup` selector example, where `subnetIdSelector` is valid and selects EC2 `Subnet` resources.
- The namespaced RDS `Instance` example included `passwordSecretRef.namespace`, but the current `passwordSecretRef` schema contains `name` and `key`. Removed the invalid namespace field.
- The text overstated Crossplane references as waiting for referenced resources to be ready. Updated the wording to say Crossplane resolves referenced managed resource identifiers during reconciliation and retries until they can be resolved.
- Updated terminology from `nameRef` / `selector` to `Ref` / `Selector` fields to match generated Crossplane field names such as `dbSubnetGroupNameRef`, `subnetIdRefs`, and `subnetIdSelector`.

## Review Notes
Flux `dependsOn` and `healthChecks` guidance is technically correct. Crossplane v2 still supports legacy cluster-scoped managed resources for backward compatibility, but Crossplane documentation describes them as legacy and recommends the namespaced managed resource model for new examples.
