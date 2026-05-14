# Validation Summary: How to Use Crossplane with Flux CD for Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Crossplane AWS providers
- AWS S3, VPC, and RDS managed resources
- Kubernetes Secrets and ProviderConfig authentication

## Sources Consulted
- Crossplane v2.2 installation documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane v2.2 provider documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane v2 upgrade documentation: https://docs.crossplane.io/v2.0/guides/upgrade-to-crossplane-v2/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Upbound Marketplace AWS S3 provider resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/
- Upbound Marketplace AWS EC2 provider resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/
- Upbound Marketplace AWS RDS provider resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/

## Issues Found
- Updated the Crossplane installation example from chart version `1.17.x` to `2.2.x` and changed the prerequisite from Kubernetes `v1.28+` to an actively supported Kubernetes version, matching current Crossplane v2.2 guidance.
- Removed the `--enable-external-secret-stores` Helm argument because that v1-era alpha feature flag is not part of the current Crossplane v2.2 feature flag set.
- Updated AWS provider package references from old `xpkg.upbound.io/upbound/...:v1.14.0` packages to current Crossplane community provider packages under `xpkg.crossplane.io/crossplane-contrib/...:v2.0.0`.
- Updated AWS managed resource API groups from legacy cluster-scoped groups such as `s3.aws.upbound.io` to Crossplane v2 namespaced groups such as `s3.aws.m.upbound.io`, and added namespaces where required.
- Updated `ProviderConfig` to use `aws.m.upbound.io/v1beta1`, added its namespace, and added `kind: ProviderConfig` to namespaced managed resource references because current provider schemas require both name and kind.
- Added the missing `SubnetGroup` resource referenced by the RDS instance. Without it, the RDS example would reference `production-db-subnet-group` but never define it.
- Adjusted the RDS `passwordSecretRef` and `writeConnectionSecretToRef` examples for namespaced managed resources, where the referenced Secrets live in the managed resource namespace.
- Updated verification commands to use the current Crossplane v2 namespaced AWS resource API groups.

## Review Notes
The updated examples are syntactically valid YAML and align with current Crossplane v2 resource naming. The RDS example still assumes that the `db-credentials` Secret exists in the `default` namespace before the managed resource is applied.
