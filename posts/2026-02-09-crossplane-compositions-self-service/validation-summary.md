# Validation Summary: How to Set Up Crossplane Compositions for Self-Service K8s Infra Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Kubernetes custom resources and claims
- Crossplane Compositions and CompositeResourceDefinitions
- Crossplane composition functions
- Upbound AWS provider
- AWS RDS
- AWS EC2 security groups
- AWS S3
- AWS CloudWatch
- Helm
- kubectl

## Sources Consulted
- Crossplane installation documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider and ProviderConfig documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane Composition documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform documentation: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Go templating function documentation: https://github.com/crossplane-contrib/function-go-templating
- Crossplane function-auto-ready documentation: https://github.com/crossplane-contrib/function-auto-ready
- Upbound provider-aws-rds Instance API reference v0.47.0: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/Instance/v1beta1
- Upbound provider-aws-ec2 SecurityGroup API reference v0.47.0: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/v0.47.0/resources/ec2.aws.upbound.io/SecurityGroup/v1beta1
- Upbound provider-aws-rds SubnetGroup API reference v0.47.0: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/SubnetGroup/v1beta1
- Upbound provider-aws-s3 BucketLifecycleConfiguration API reference v0.47.0: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v0.47.0/resources/s3.aws.upbound.io/BucketLifecycleConfiguration/v1beta1
- Upbound provider-aws-cloudwatch MetricAlarm API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-cloudwatch/v1.0.0/resources/cloudwatch.aws.upbound.io/MetricAlarm/v1beta1
- AWS S3 Block Public Access documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html

## Issues Found
- The Composition examples used legacy `spec.resources` syntax. Crossplane documentation now recommends `mode: Pipeline` with composition functions, and current API documentation describes Pipeline mode. Updated the composition examples to use Function Patch and Transform.
- The post used composition functions without installing them. Added Function manifests for `function-patch-and-transform`, `function-go-templating`, and `function-auto-ready`, plus kubectl wait commands.
- The PostgreSQL XRD declared `status.port` as a string while the RDS Instance status exposes port as a number. Changed the XRD field to integer.
- The RDS connection details block omitted the required `type: FromConnectionSecretKey` entries for Function Patch and Transform. Added explicit connection detail types and a per-XR managed-resource connection secret name patch.
- The production RDS example omitted required RDS configuration such as region and master credential fields. Added region patching and baseline RDS fields.
- The conditional logic section incorrectly claimed patch transforms could conditionally create resources and patched a boolean into RDS replica fields. Rewrote the example to use Go templating for optional resource creation and a selector-based replica reference.
- The S3 composition used legacy composition syntax and omitted `region` on S3 subresources that require it. Converted it to Pipeline mode and added region fields.
- The S3 public access toggle only patched `blockPublicPolicy`, leaving the other Block Public Access settings enabled. Updated the example to patch all four bucket-level Block Public Access fields and changed the parameter description so it does not imply that a bucket policy is automatically created.
- The ObjectStorage XRD did not require `spec.parameters` even though it required fields inside it. Added `parameters` to the required list.
- The final composition function example omitted required RDS provider fields. Added region, instance class, storage, database name, username, and password secret reference.

## Review Notes
The Upbound AWS provider version in the post is pinned to `v0.47.0`, which is old. The corrected examples keep that API group style because the post explicitly uses that provider version, but future updates should consider current Upbound provider packages and Crossplane v2 namespaced managed resource APIs. Helm and kubectl were not installed in the local review environment, so CLI commands were checked against official documentation rather than executed against a live cluster. YAML snippets were parsed locally, excluding the Go template block where template expressions are expected.
