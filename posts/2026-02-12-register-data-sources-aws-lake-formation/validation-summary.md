# Validation Summary: How to Register Data Sources in AWS Lake Formation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lake Formation
- AWS Glue Data Catalog
- Amazon S3
- AWS CLI
- AWS Identity and Access Management (IAM)
- AWS CloudFormation

## Sources Consulted
- AWS CLI Command Reference: lakeformation register-resource - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/register-resource.html
- AWS CLI Command Reference: lakeformation describe-resource - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/describe-resource.html
- AWS CLI Command Reference: lakeformation grant-permissions - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/grant-permissions.html
- AWS CLI Command Reference: lakeformation revoke-permissions - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/revoke-permissions.html
- AWS CLI Command Reference: lakeformation put-data-lake-settings - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/put-data-lake-settings.html
- AWS Lake Formation Developer Guide: Adding an Amazon S3 location to your data lake - https://docs.aws.amazon.com/lake-formation/latest/dg/register-data-lake.html
- AWS Lake Formation Developer Guide: Underlying data access control - https://docs.aws.amazon.com/lake-formation/latest/dg/access-control-underlying-data.html
- AWS Lake Formation Developer Guide: Requirements for roles used to register locations - https://docs.aws.amazon.com/lake-formation/latest/dg/registration-role.html
- AWS Lake Formation Developer Guide: Changing the default settings for your data lake - https://docs.aws.amazon.com/lake-formation/latest/dg/change-settings.html
- AWS CloudFormation Template Reference: AWS::LakeFormation::Resource - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lakeformation-resource.html

## Issues Found
- Fixed AWS CLI boolean flag usage for `aws lakeformation register-resource`. The CLI uses `--use-service-linked-role` and `--no-use-service-linked-role` flags, not `--use-service-linked-role true` or `--use-service-linked-role false`.
- Clarified that Lake Formation controls access for integrated AWS services requesting registered data, but does not prevent direct S3 API or console access when IAM or bucket policies still allow it.
- Corrected the verification description for `describe-resource`; the output includes role verification status, not an "active" flag.
- Fixed the analytics "read-only access" example. `DESCRIBE` on the database only grants database metadata visibility, so the example now also grants table-level `SELECT` and `DESCRIBE` on the table wildcard.
- Clarified troubleshooting language for Glue tables whose S3 locations are not registered. The issue is that Lake Formation cannot control the underlying data access, not that tables necessarily fail to appear in Lake Formation.

## Review Notes
- The custom registration role policy is a typical same-account S3 policy. Encrypted S3 locations, cross-account S3 locations, and Amazon EMR access can require additional role permissions or a user-defined role.
