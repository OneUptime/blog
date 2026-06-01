# Validation Summary: How to Use AWS License Manager with EC2 and RDS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS License Manager
- Amazon EC2
- Amazon RDS
- AWS CLI
- AWS Organizations
- AWS Resource Access Manager
- AWS Systems Manager inventory

## Sources Consulted
- AWS CLI Command Reference: `license-manager update-service-settings` - https://docs.aws.amazon.com/cli/latest/reference/license-manager/update-service-settings.html
- AWS CLI Command Reference: `license-manager create-license-configuration` - https://docs.aws.amazon.com/cli/latest/reference/license-manager/create-license-configuration.html
- AWS CLI Command Reference: `license-manager update-license-specifications-for-resource` - https://docs.aws.amazon.com/cli/latest/reference/license-manager/update-license-specifications-for-resource.html
- AWS CLI Command Reference: `license-manager create-license-manager-report-generator` - https://docs.aws.amazon.com/cli/latest/reference/license-manager/create-license-manager-report-generator.html
- AWS CLI Command Reference: `ec2 run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: `rds create-db-instance` - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: `ram create-resource-share` - https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- AWS IAM Command Reference: `create-service-linked-role` - https://docs.aws.amazon.com/cli/latest/reference/iam/create-service-linked-role.html
- AWS License Manager User Guide: Self Managed License Rules - https://docs.aws.amazon.com/license-manager/latest/userguide/license-rules.html
- AWS License Manager User Guide: Working with License Manager - https://docs.aws.amazon.com/license-manager/latest/userguide/using-license-manager.html
- Amazon RDS User Guide: Licensing Microsoft SQL Server on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Concepts.General.Licensing.html
- AWS Cloud Operations Blog: Use AWS License Manager API operations to manage your software licenses in the cloud - https://aws.amazon.com/blogs/mt/use-aws-license-manager-api-operations-to-manage-your-software-licenses-in-the-cloud/

## Issues Found
- The setup command used `aws license-manager create-service-linked-role`, which is not a valid License Manager CLI command. Changed it to `aws iam create-service-linked-role --aws-service-name license-manager.amazonaws.com`.
- The License Manager settings command used `--s3-resource-arn`, but the current AWS CLI option is `--s3-bucket-arn`. Added `--organization-configuration EnableIntegration=true` for Organizations integration.
- Several License Manager ARNs used `license-configuration/lic-...`; current AWS examples and ARN formats use `license-configuration:lic-...`. Updated the examples.
- The AMI association example used nonexistent `create-license-configuration-association`. Replaced it with `update-license-specifications-for-resource`, which supports AMI and instance license specification updates.
- The RDS section showed standard RDS for SQL Server using `--license-model bring-your-own-license`, but Amazon RDS for SQL Server is license-included for normal DB instances. Reworked the example to use RDS for Oracle BYOL with License Manager product information filters.
- The RDS section manually associated an RDS DB ARN with `update-license-specifications-for-resource`; current CLI/API docs describe that operation for AMIs, instances, and hosts. Replaced this with License Manager discovery based on the RDS product information filter.
- The IAM policy snippet used an unsupported `license-manager:LicenseConfigurationArn` condition key for `ec2:RunInstances`. Replaced it with an explicit `aws ec2 run-instances --license-specifications` example and guidance to use approved AMIs/templates/products.
- The report generator example omitted required `--client-token`. Added a client token.
- The RAM example shared with an OU but did not restrict external principals. Added `--no-allow-external-principals` to align with the intended Organizations-only sharing pattern.

## Review Notes
The AWS CLI was not installed in the local workspace, so commands were verified against current official AWS CLI documentation rather than local `aws help` output.
