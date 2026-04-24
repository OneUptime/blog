# Validation Summary: How to Use Crossplane with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Fleet
- Kubernetes
- Helm
- Crossplane
- Upbound AWS providers for Crossplane
- AWS S3
- AWS RDS for PostgreSQL

## Sources Consulted
- Crossplane installation docs: https://docs.crossplane.io/latest/get-started/install/
- Crossplane providers docs: https://docs.crossplane.io/latest/packages/providers/
- Crossplane managed resources guide: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane get started with managed resources: https://docs.crossplane.io/latest/get-started/get-started-with-managed-resources/
- Crossplane XRD docs: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane compositions docs: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane function patch-and-transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane functions docs: https://docs.crossplane.io/latest/packages/functions/
- Crossplane upgrade to v2 guide: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Upbound Marketplace AWS family provider config docs: https://marketplace.upbound.io/providers/upbound/provider-family-aws/v2.2.0/resources/aws.m.upbound.io/ClusterProviderConfig/v1beta1
- Upbound Marketplace S3 Bucket docs: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.5.1/resources/s3.aws.m.upbound.io/Bucket/v1beta1
- Upbound Marketplace S3 BucketVersioning docs: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/v2.1.1/resources/s3.aws.m.upbound.io/BucketVersioning/v1beta1
- Upbound Marketplace RDS Instance docs: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v2.1.1/resources/rds.aws.m.upbound.io/Instance/v1beta1
- Fleet Git repository contents docs: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- AWS RDS VPC guidance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html

## Issues Found
- The post installed only the S3 provider but later used an RDS managed resource. I updated the provider install example to install both `provider-aws-s3` and `provider-aws-rds`.
- The provider install example used `ControllerConfig`, which Crossplane deprecated and removed in v2. I removed that configuration and kept the provider installation example on current supported package APIs.
- The AWS credentials example used a multiline `--from-literal` secret payload and an older `aws.upbound.io/v1beta1` `ProviderConfig`. I changed it to the current documented file-backed secret flow and a `ClusterProviderConfig` in `aws.m.upbound.io/v1beta1`.
- The S3 and RDS managed resource examples used outdated API groups and assumptions from older cluster-scoped providers. I updated them to current namespaced AWS managed resources and added the required `providerConfigRef.kind`.
- The S3 example used a fixed bucket name and an outdated `BucketVersioning` shape. I changed the bucket to use `generateName` with a selector-based reference and corrected `versioningConfiguration` to the current object form.
- The RDS example used the outdated `dbInstanceClass` field and omitted password handling required by current provider docs. I changed it to `instanceClass` plus `autoGeneratePassword` and `passwordSecretRef`, and simplified the teardown settings.
- The Composition used legacy native patch-and-transform syntax that Crossplane v2 removed. I converted it to a current `mode: Pipeline` Composition using `function-patch-and-transform`.
- The post used claims-style workflow, but current Crossplane v2 guidance favors namespaced composite resources. I updated the XRD and the consumer example to use a namespaced composite resource directly.
- The Fleet example incorrectly stored a composite resource manifest inside a `ConfigMap`. I replaced it with a valid `fleet.yaml` plus a raw YAML composite resource manifest, which matches how Fleet scans Git repositories.

## Review Notes
- The RDS example is appropriate for a default VPC or similarly prepared environment. In non-default VPCs, teams should set subnet groups and security groups explicitly.
- Provider package versions move quickly. The updated manifests pin current package versions reviewed on 2026-04-24, but these should be rechecked before future republishes.
- The article now reflects Crossplane v2-era composition guidance while keeping the original structure and scope.
