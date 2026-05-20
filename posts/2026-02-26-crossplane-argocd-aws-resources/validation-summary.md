# Validation Summary: How to Manage AWS Resources with Crossplane and ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Crossplane
- Crossplane Compositions and Functions
- Upbound AWS providers for S3, RDS, EC2, and IAM
- AWS S3
- Amazon RDS for PostgreSQL
- AWS VPC networking
- Kubernetes manifests and Secrets
- Helm
- Argo CD and GitOps

## Sources Consulted
- Crossplane install documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Upbound AWS ProviderConfig API reference: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1
- Upbound AWS S3 BucketVersioning API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v1.14.0/resources/s3.aws.upbound.io/BucketVersioning/v1beta1
- Upbound AWS RDS Instance API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v1.1.1/resources/rds.aws.upbound.io/Instance
- Upbound AWS RDS SubnetGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v1.1.0/resources/rds.aws.upbound.io/SubnetGroup/v1beta1
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html

## Issues Found
- The RDS `Instance` manifests used `rds.aws.upbound.io/v1beta1`, but the Upbound AWS RDS provider exposes `Instance` as `rds.aws.upbound.io/v1beta2` for the pinned provider generation. Updated the RDS instance examples and sync-wave snippet to `v1beta2`.
- The RDS PostgreSQL example used engine version `15.4`, which has reached the end of standard support on Amazon RDS. Updated it to `15.17`, which is listed in current Amazon RDS for PostgreSQL release notes.
- The Composition example used the legacy native `spec.resources` patch-and-transform form. Current Crossplane documentation uses `mode: Pipeline` with Function Patch and Transform, so the example now installs `function-patch-and-transform` and uses `pt.fn.crossplane.io/v1beta1` `Resources` input.
- The Composition's RDS base omitted fields needed for a practical RDS instance template, including storage and master user password configuration. Added fixed platform-owned defaults for `allocatedStorage`, `storageType`, `username`, and `passwordSecretRef` while keeping the claim-facing abstraction unchanged.
- The best-practice note said to set `deletionProtection: true` on S3, but S3 buckets do not use that RDS field. Reworded it to recommend RDS deletion protection and Crossplane `deletionPolicy: Orphan` where appropriate.

## Review Notes
The post still uses pinned Upbound provider package versions from the v1 provider line, whose resource API groups match the examples after correction. Newer Upbound AWS provider v2 packages use namespaced `.aws.m.upbound.io` API groups, so a future update to provider v2 examples would require changing API groups and scoping throughout the article.
