# Validation Summary: How to Use Redshift Data Sharing for Cross-Account Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Redshift
- Amazon Redshift Serverless
- Redshift data sharing and datashares
- AWS CLI
- SQL
- AWS CloudFormation custom resources

## Sources Consulted
- Amazon Redshift Database Developer Guide: CREATE DATASHARE: https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_DATASHARE.html
- Amazon Redshift Database Developer Guide: ALTER DATASHARE: https://docs.aws.amazon.com/redshift/latest/dg/r_ALTER_DATASHARE.html
- Amazon Redshift Database Developer Guide: CREATE DATABASE from a datashare: https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_DATABASE.html
- Amazon Redshift Database Developer Guide: GRANT, including datashare producer and consumer permissions: https://docs.aws.amazon.com/redshift/latest/dg/r_GRANT.html
- Amazon Redshift Database Developer Guide: Standard datashares and namespace ARN formats: https://docs.aws.amazon.com/redshift/latest/dg/standard_datashare.html
- Amazon Redshift Database Developer Guide: Data sharing with writes: https://docs.aws.amazon.com/redshift/latest/dg/getting-started-datashare-writes.html
- Amazon Redshift Database Developer Guide: Data sharing read/write considerations: https://docs.aws.amazon.com/redshift/latest/dg/considerations-datashare-reads-writes.html
- Amazon Redshift Database Developer Guide: Working with views in data sharing: https://docs.aws.amazon.com/redshift/latest/dg/datashare-views.html
- Amazon Redshift Database Developer Guide: SYS_QUERY_HISTORY: https://docs.aws.amazon.com/redshift/latest/dg/SYS_QUERY_HISTORY.html
- AWS CLI Command Reference: redshift authorize-data-share: https://docs.aws.amazon.com/cli/latest/reference/redshift/authorize-data-share.html
- AWS CLI Command Reference: redshift associate-data-share-consumer: https://docs.aws.amazon.com/cli/latest/reference/redshift/associate-data-share-consumer.html
- AWS CLI Command Reference: redshift-serverless get-namespace: https://docs.aws.amazon.com/cli/latest/reference/redshift-serverless/get-namespace.html

## Issues Found
- The post described consumer databases as read-only in all cases. Amazon Redshift now supports data sharing with writes when explicitly configured and authorized, so the wording was narrowed to the read-only default/examples.
- Several namespace examples used placeholder values that looked like UUIDs but included invalid UUID-style characters. These were replaced with valid UUID-style placeholders.
- The provisioned-cluster namespace lookup returned `ClusterNamespaceArn` while the SQL examples require the namespace GUID. I added a note explaining that the GUID is the final segment of the ARN.
- The same-account `CREATE DATABASE` example was used later for object-level access control, but object-level grants require creating the datashare database with `WITH PERMISSIONS`. I added `WITH PERMISSIONS` and clarified the access-control section.
- The datashare ARN examples used `producer-namespace` as a placeholder. I replaced it with the documented datashare ARN shape that includes the producer namespace GUID.
- The performance query referenced `stl_query.database_name` and `stl_query.bytes_scanned`, which are not columns in `stl_query`. I replaced it with a `sys_query_history` query using documented columns.

## Review Notes
- The CloudFormation section is illustrative because `Custom::DataShareSetup` is a user-defined custom resource, not a native CloudFormation resource type.
- The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference.
