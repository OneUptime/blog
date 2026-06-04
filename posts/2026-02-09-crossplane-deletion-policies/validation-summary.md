# Validation Summary: How to Configure Crossplane Resource Deletion Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Crossplane managed resources
- Crossplane compositions and composite resources
- Upbound AWS providers for S3, RDS, EC2, and ELBv2
- Kubernetes finalizers and admission webhooks
- AWS CLI
- Prometheus alerting
- jq

## Sources Consulted
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane v1.20 managed resources documentation: https://docs.crossplane.io/v1.20/concepts/managed-resources/
- Crossplane compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane v2 changes and compatibility documentation: https://docs.crossplane.io/latest/whats-new/
- Crossplane metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- Crossplane usages documentation: https://docs.crossplane.io/latest/managed-resources/usages/
- Upbound provider-aws-s3 Bucket resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/Bucket/v1beta1
- Upbound provider-aws-s3 BucketVersioning resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest/resources/s3.aws.upbound.io/BucketVersioning/v1beta1
- Upbound provider-aws-rds Instance resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/Instance/v1beta1
- AWS CLI RDS command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/

## Issues Found
- The post stated that deleting an S3 Bucket managed resource with `deletionPolicy: Delete` deletes the bucket and contents. Upbound's S3 Bucket resource requires `forceDestroy: true` to delete a non-empty bucket, so the wording and temporary bucket example were corrected.
- Composition examples used native `spec.resources` patch-and-transform syntax. Crossplane deprecated native patch and transform in v1.17 and removed it in v2, so the examples were updated to current `mode: Pipeline` syntax using `function-patch-and-transform`.
- A namespaced production "claim" example used the composite resource kind instead of the claim kind. It was corrected to `PostgreSQLInstanceClaim`.
- The observe-only import example used the invalid singular field `managementPolicy: ObserveOnly`. It was corrected to `managementPolicies: ["Observe"]`, matching current Crossplane management policy semantics.
- The AWS CLI RDS tag query assumed `describe-db-instances` returned tags directly. It was corrected to list DB instance identifiers and ARNs, then inspect tags with `list-tags-for-resource`.
- The cascading deletion example implied an XR-level `deletionPolicy` controlled child external resources and included an invalid finalizer. It was corrected to explain that Crossplane deletes composed Kubernetes resources and each child managed resource controls external deletion through `deletionPolicy` or `managementPolicies`.
- The stateful composition's BucketVersioning resource did not reference the bucket and used `Delete`, which conflicts with preserving bucket versioning. It now uses `bucketSelector.matchControllerRef: true` and `deletionPolicy: Orphan`.
- The monitoring example used a non-existent built-in `crossplane_managed_resource_info` metric and `deletion_policy` label. It now states that this requires kube-state-metrics custom resource state metrics or another inventory exporter, and avoids presenting the label as a built-in Crossplane provider metric.
- The production deletion-policy inventory command filtered by namespace even though the provider API examples are cluster-scoped. It now filters tagged production resources through `.spec.forProvider.tags.Environment`.

## Review Notes
The post still uses Crossplane v1-style XRDs and claims with cluster-scoped Upbound AWS managed resource API groups. Crossplane v2 remains backward compatible with v1-style APIs, but new Crossplane v2 installations may prefer namespaced managed resource API groups such as `*.aws.m.upbound.io` and XRD `apiextensions.crossplane.io/v2` patterns.
