# Validation Summary: How to Set Up Amazon Lake Formation for Data Lakes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lake Formation
- Amazon S3
- AWS Glue Data Catalog
- AWS Glue crawlers
- AWS Identity and Access Management (IAM)
- Amazon Athena
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: lakeformation register-resource - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/register-resource.html
- AWS Lake Formation Developer Guide: Requirements for roles used to register locations - https://docs.aws.amazon.com/lake-formation/latest/dg/registration-role.html
- AWS Lake Formation Developer Guide: Changing the default settings for your data lake - https://docs.aws.amazon.com/lake-formation/latest/dg/change-settings.html
- AWS Glue User Guide: Configuring a crawler to use Lake Formation credentials - https://docs.aws.amazon.com/glue/latest/dg/crawler-lf-integ.html
- AWS CLI Command Reference: glue create-crawler - https://docs.aws.amazon.com/cli/latest/reference/glue/create-crawler.html
- AWS Lake Formation Developer Guide: Lake Formation permissions reference - https://docs.aws.amazon.com/lake-formation/latest/dg/lf-permissions-reference.html
- AWS Lake Formation Developer Guide: Granting data location permissions - https://docs.aws.amazon.com/lake-formation/latest/dg/granting-location-permissions-local.html
- AWS CLI Command Reference: lakeformation grant-permissions - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/grant-permissions.html
- AWS CLI Command Reference: athena start-query-execution - https://docs.aws.amazon.com/cli/latest/reference/athena/start-query-execution.html

## Issues Found
- The S3 registration command supplied both `--role-arn` and `--use-service-linked-role`. AWS documents these as alternative registration modes: use the service-linked role, or provide a custom role. I updated the tutorial to use the custom `LakeFormationDataAccessRole` consistently and removed the conflicting service-linked-role flag.
- The post instructed readers to create a custom Lake Formation data access role but described the step as creating the service-linked role. I changed the heading and explanation to describe a custom data access role, while noting that the service-linked role is an alternative.
- The Glue crawler role only attached `AWSGlueServiceRole`. With Lake Formation permissions enforced and the S3 location registered, the crawler also needs Lake Formation access. I added `lakeformation:GetDataAccess`, Lake Formation `CREATE_TABLE`/`DESCRIBE` permissions on the `raw_data` database, `DATA_LOCATION_ACCESS` on the registered S3 bucket, and `--lake-formation-configuration` so the crawler uses Lake Formation credentials.
- The permissions section implied Lake Formation replaces all IAM policy concerns. AWS documents that Lake Formation permissions work with IAM permissions. I narrowed the claim to S3 policy management and added a note that users still need IAM permissions for the AWS services they call.

## Review Notes
The AWS CLI examples use placeholder account IDs, users, roles, and bucket names; readers must replace them with real values. The Athena query assumes the Glue crawler creates a table named `sales`, which is plausible for the shown S3 prefix but can vary if crawler grouping or naming configuration changes.
