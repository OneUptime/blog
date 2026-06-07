# Validation Summary: How to Import Existing Resources into Pulumi

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Pulumi CLI (import, convert, refresh, stack, state commands)
- Pulumi TypeScript SDK (`@pulumi/pulumi`, `@pulumi/aws`)
- Pulumi Python SDK (`pulumi`, `pulumi_aws`)
- AWS resources (S3, EC2, RDS, Security Groups, VPC, Subnets, Lambda)
- Azure (azure-native provider, Resource Groups, Web Apps)
- GCP (Compute Engine)
- Terraform state migration via `pulumi convert` and `pulumi import --from terraform`
- GitHub Actions (`pulumi/actions@v5`)
- Mermaid diagrams

## Sources Consulted
- [pulumi import CLI reference](https://www.pulumi.com/docs/iac/cli/commands/pulumi_import/)
- [pulumi convert CLI reference](https://www.pulumi.com/docs/iac/cli/commands/pulumi_convert/)
- [pulumi refresh CLI reference](https://www.pulumi.com/docs/iac/cli/commands/pulumi_refresh/)
- [pulumi stack CLI reference](https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/)
- [Migrating to Pulumi from Terraform](https://www.pulumi.com/docs/using-pulumi/adopting-pulumi/migrating-to-pulumi/from-terraform/)
- [Pulumi Adopting Existing Resources / Import](https://www.pulumi.com/docs/using-pulumi/adopting-pulumi/import/)

## Issues Found
- **Section 7 "Handle State Import Conflicts" used a non-existent `--mapping` flag on `pulumi import --from terraform`.** The Pulumi `import` command does not accept a `--mapping`/`--mappings` flag — that flag belongs to `pulumi convert` (and is plural, `--mappings`), and it's used to map Terraform provider plugins to Pulumi plugins, not to rename resources. The example also implied you could remap Terraform resource addresses (e.g., `aws_s3_bucket.data` → `dataBucket`) at import time, which is not a supported feature. Rewrote the subsection to show the correct workflow: import from the `.tfstate` file, then use `pulumi state rename` to adjust resource names, and clarified that `--mappings` is a `pulumi convert` concept for provider mappings rather than an import-time resource rename mechanism.

## Review Notes
- The post uses `aws.s3.Bucket` with inline properties (`acl`, `versioning`, `serverSideEncryptionConfiguration`, `lifecycleRules`). These inline properties are deprecated in `@pulumi/aws` v4+ in favor of `aws.s3.BucketV2` plus standalone resources (`BucketAclV2`, `BucketVersioningV2`, `BucketServerSideEncryptionConfigurationV2`, `BucketLifecycleConfigurationV2`, `BucketCorsConfigurationV2`). The legacy `Bucket` resource still works, so the code is functional, but a future revision should consider migrating examples to `BucketV2` to align with current best practices.
- `--generate-code=true` is the default for `pulumi import`, so it's redundant but harmless.
- `--protect` is also enabled by default on `pulumi import`, so the `protect: true` resource option in generated examples mirrors the actual behavior.
- All CLI commands (`pulumi stack --show-urns`, `pulumi refresh --preview-only`, `pulumi refresh --expect-no-changes`, `pulumi import --file`, `pulumi import --from terraform`, `pulumi convert --from terraform --language ... --out ...`) verified against the official CLI reference.
- AWS/Azure/GCP cloud CLI commands (`aws s3 ls`, `aws ec2 describe-instances`, `az group show`, `gcloud compute instances list`, etc.) are syntactically correct.
- Pulumi resource type tokens (`aws:s3/bucket:Bucket`, `aws:ec2/instance:Instance`, `aws:ec2/securityGroup:SecurityGroup`, `aws:rds/instance:Instance`, `aws:ec2/vpc:Vpc`, `aws:ec2/subnet:Subnet`, `azure-native:resources:ResourceGroup`, `azure-native:web:WebApp`, `gcp:compute/instance:Instance`) match the Pulumi registry conventions.
