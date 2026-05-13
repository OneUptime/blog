# Validation Summary: How to Create Crossplane Compositions with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Crossplane CompositeResourceDefinitions and Compositions
- Crossplane Function Patch and Transform
- Upbound AWS RDS provider
- Flux CD Kustomization
- Kubernetes manifests and kubectl

## Sources Consulted
- Crossplane CompositeResourceDefinitions documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Upbound provider-aws-rds Instance resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound provider-aws-rds SubnetGroup resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.3/resources/rds.aws.m.upbound.io/SubnetGroup/v1beta1
- Upbound provider-family-aws ProviderConfig documentation: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post used the older Crossplane claim-based example and legacy Composition `resources` format. Updated the XRD to the current namespaced composite resource model and changed the Composition to `mode: Pipeline` with `function-patch-and-transform`.
- The introduction, diagram, test step, verification commands, and conclusion referred to inconsistent resource names or claims. Updated those references to use the `PostgreSQLInstance` composite resource consistently.
- The RDS managed resources used older cluster-scoped Upbound API groups. Updated the examples to the current namespaced AWS RDS API group, `rds.aws.m.upbound.io/v1beta1`.
- `providerConfigRef` was incorrectly nested under `spec.forProvider`. Moved it to `spec.providerConfigRef` and included the required `kind` field.
- The RDS instance was not connected to the subnet group it created. Added `dbSubnetGroupNameSelector.matchControllerRef: true`.
- The RDS instance example omitted required practical creation fields for a standalone PostgreSQL instance. Added a username and generated password secret reference.
- The XRD schema did not require `spec.parameters`, even though the Composition patches from it. Added `required: [parameters]` under the `spec` schema.
- The verification commands used old resource names and cluster-scoped commands. Updated them to use namespaced `postgresqlinstances` and `instances.rds.aws.m.upbound.io`.

## Review Notes
- The subnet IDs are still placeholders and must be replaced with valid subnet IDs in the target AWS account and region.
- The example assumes a default AWS `ProviderConfig` exists and that the Upbound AWS RDS provider and Crossplane patch-and-transform function are installed before Flux applies the Composition.
