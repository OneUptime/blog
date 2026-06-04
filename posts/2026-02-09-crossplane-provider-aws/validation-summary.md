# Validation Summary: How to Configure Crossplane Provider for AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Crossplane
- Crossplane provider-aws
- AWS IAM and IRSA
- Amazon S3
- Amazon RDS
- Amazon VPC and EC2 networking
- PrometheusRule monitoring

## Sources Consulted
- Crossplane CLI command reference: https://docs.crossplane.io/latest/cli/
- Crossplane provider package documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- provider-aws v0.40.0 ProviderConfig schema: https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/v0.40.0/resources/aws.crossplane.io/ProviderConfig/v1beta1
- provider-aws v0.40.0 RDSInstance schema: https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/v0.40.0/resources/database.aws.crossplane.io/RDSInstance/v1beta1
- provider-aws v0.40.0 DBSubnetGroup schema: https://marketplace.upbound.io/providers/crossplane-contrib/provider-aws/v0.40.0/resources/database.aws.crossplane.io/DBSubnetGroup/v1beta1
- provider-aws v0.40.0 CRD schemas from the official GitHub tag: https://github.com/crossplane-contrib/provider-aws/tree/v0.40.0/package/crds
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
- The provider install command used the old `kubectl crossplane install provider` form. Updated it to the current Crossplane CLI `crossplane xpkg install provider` syntax and supplied the provider name so the later `provider/provider-aws` wait command matches the installed object.
- The S3 `Bucket` example used `region`, but provider-aws v0.40.0 requires `locationConstraint` for S3 bucket creation. Updated the field.
- The S3 `Bucket` example used `versioning`, but the v0.40.0 schema uses `versioningConfiguration`. Updated the field.
- The RDS example used `skipFinalSnapshot`, but the v0.40.0 `RDSInstance` schema uses `skipFinalSnapshotBeforeDeletion`. Updated the field.
- The VPC example used `enableDnsHostnames`, but the provider-aws v0.40.0 schema uses `enableDnsHostNames`. Updated the field.
- The subnet example selected the VPC by label, but the VPC manifest did not define the matching label. Added `metadata.labels.name: crossplane-vpc` to make `vpcIdSelector.matchLabels` resolve.

## Review Notes
The post intentionally pins `crossplane-contrib/provider-aws:v0.40.0`, which is now an outdated provider version. The examples were validated against that pinned version rather than rewritten to the newer provider families or newer `*.aws.upbound.io` API groups.
