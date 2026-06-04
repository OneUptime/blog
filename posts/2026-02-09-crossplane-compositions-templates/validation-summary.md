# Validation Summary: How to Configure Crossplane Compositions for Resource Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Crossplane Compositions
- Crossplane Composite Resource Definitions and Claims
- Crossplane Function Patch and Transform
- Upbound AWS S3 provider
- Upbound AWS RDS provider
- Upbound AWS EC2 provider
- Upbound GCP Cloud SQL provider

## Sources Consulted
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Composite Resources documentation: https://docs.crossplane.io/v1.19/concepts/composite-resources/
- Crossplane Composite Resource Definitions documentation: https://docs.crossplane.io/v1.20/concepts/composite-resource-definitions/
- Crossplane connection details composition guide: https://docs.crossplane.io/master/guides/connection-details-composition/
- Upbound AWS S3 Bucket API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.5.3/resources/s3.aws.m.upbound.io/Bucket/v1beta1
- Upbound AWS S3 BucketPublicAccessBlock API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.0.0/resources/s3.aws.m.upbound.io/BucketPublicAccessBlock/v1beta1
- Upbound AWS S3 BucketVersioning API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.1.1/resources/s3.aws.m.upbound.io/BucketVersioning/v1beta1
- Upbound AWS S3 BucketServerSideEncryptionConfiguration API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.5.1/resources/s3.aws.m.upbound.io/BucketServerSideEncryptionConfiguration/v1beta1
- Upbound AWS RDS Instance API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Upbound AWS RDS SubnetGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.3/resources/rds.aws.m.upbound.io/SubnetGroup/v1beta1
- Upbound AWS RDS ParameterGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.5.3/resources/rds.aws.m.upbound.io/ParameterGroup/v1beta1
- Upbound GCP SQL DatabaseInstance API reference: https://marketplace.upbound.io/providers/upbound/provider-gcp-sql/v2.5.3/resources/sql.gcp.m.upbound.io/DatabaseInstance/v1beta1

## Issues Found
- The Composition examples used the deprecated top-level `spec.resources` form. Updated complete Composition snippets to use `mode: Pipeline` with `function-patch-and-transform` input resources.
- The S3 example used outdated inline bucket fields for ACLs, public access block, versioning, and server-side encryption. Replaced it with current managed resources: `Bucket`, `BucketPublicAccessBlock`, `BucketVersioning`, and `BucketServerSideEncryptionConfiguration`.
- Several AWS RDS examples used outdated provider API groups and kinds such as `database.aws.crossplane.io/v1beta1` `RDSInstance`, `DBSubnetGroup`, and `DBParameterGroup`. Updated them to current Upbound provider resources: `rds.aws.m.upbound.io/v1beta1` `Instance`, `SubnetGroup`, and `ParameterGroup`.
- Corrected RDS field names, including `dbInstanceClass` to `instanceClass`, `preferredBackupWindow` to `backupWindow`, `preferredMaintenanceWindow` to `maintenanceWindow`, `multiAZ` to `multiAz`, and `parameters` to `parameter`.
- Corrected the transform example so the math transform uses `math.type: multiply`, which is the documented Function Patch and Transform syntax.
- Corrected connection detail entries to include `type: FromConnectionSecretKey`, which Function Patch and Transform requires.
- Updated the GCP Cloud SQL example from the outdated `database.gcp.crossplane.io` `CloudSQLInstance` form to `sql.gcp.m.upbound.io/v1beta1` `DatabaseInstance`.
- Clarified that claims are namespaced resources available when an XRD defines claim names, and that Composition selection uses `compositionSelector.matchLabels`.

## Review Notes
The examples are illustrative and still omit surrounding XRD schemas, provider installation, provider credentials, namespaces, and some required application-specific fields. Those omissions are acceptable for a focused Composition article, but a future hands-on version should include full runnable manifests and tested provider versions.
