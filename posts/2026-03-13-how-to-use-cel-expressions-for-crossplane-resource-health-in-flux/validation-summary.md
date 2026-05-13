# Validation Summary: How to Use CEL Expressions for Crossplane Resource Health in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization health checks
- Flux CEL health check expressions
- Kubernetes custom resources
- Crossplane managed resources
- Crossplane compositions and claims
- Upbound AWS and GCP providers
- kubectl and Flux CLI debugging commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux v2.5 announcement and supported versions: https://fluxcd.io/blog/2025/02/flux-v2.5.0/
- Flux v2.3.0 release CRD schemas: https://github.com/fluxcd/flux2/releases/tag/v2.3.0
- Flux v2.5.0 release CRD schemas: https://github.com/fluxcd/flux2/releases/tag/v2.5.0
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane composite resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/
- Crossplane provider configuration documentation: https://docs.crossplane.io/latest/packages/providers/
- Upbound AWS RDS Instance resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound AWS ElastiCache ReplicationGroup resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-elasticache/v2.5.2/resources/elasticache.aws.m.upbound.io/ReplicationGroup
- Upbound GCP SQL provider documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-sql
- Upbound GCP Storage provider documentation: https://marketplace.upbound.io/providers/upbound/provider-gcp-storage/v2.5.0?tab=managedResources

## Issues Found
- The Flux examples incorrectly nested `cel.healthyWhen` under individual `healthChecks` entries. Flux uses `spec.healthCheckExprs` with `current`, `inProgress`, and `failed` expressions, while `spec.healthChecks` identifies specific resources to include in the health assessment. Updated all examples to use `healthChecks` plus `healthCheckExprs`.
- The prerequisite listed Flux v2.3 or later, but the official Flux v2.3.0 CRD schemas do not include `healthCheckExprs`. Updated the prerequisite to Flux v2.5 or later after checking the v2.5.0 release schemas.
- The Kubernetes prerequisite listed version 1.25 or later, which is not accurate for Flux v2.5 support. Updated it to refer to the Kubernetes versions supported by the selected Flux release and noted the Flux v2.5 supported range.
- The Upbound provider API groups in the examples used older cluster-scoped groups while the examples included namespaces. Updated the AWS and GCP examples to current namespaced provider groups such as `rds.aws.m.upbound.io`, `s3.aws.m.upbound.io`, and `storage.gcp.m.upbound.io`.
- The RDS `Instance` example used `masterUsername` and `masterPasswordSecretRef`, which are fields for RDS Cluster resources rather than the current namespaced RDS Instance API. Updated them to `username` and `passwordSecretRef`.
- The Crossplane v2 provider configuration reference omitted the required `kind`. Added `kind: ProviderConfig` to the example and updated the debugging command to query `providerconfig.aws.m.upbound.io` in the resource namespace.
- The debugging commands used the older RDS resource shortcut. Updated them to query `instance.rds.aws.m.upbound.io` with the namespace used by the namespaced managed resource examples.

## Review Notes
The CEL expressions intentionally check both Crossplane `Ready` and `Synced` conditions, which matches Crossplane condition semantics for managed resources and composite resources. Future improvements could add optional Flux `inProgress` and `failed` expressions for faster failure reporting, but the corrected `current` expressions are valid.
