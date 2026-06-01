# Validation Summary: How to Use Aurora Zero-ETL Integration with Redshift

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Aurora MySQL-Compatible Edition
- Amazon Aurora PostgreSQL-Compatible Edition
- Amazon Redshift Serverless
- Amazon Redshift provisioned clusters
- AWS CLI
- Amazon CloudWatch
- SQL

## Sources Consulted
- AWS Aurora User Guide: Setting up zero-ETL integrations, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/zero-etl.setting-up.html
- AWS Aurora User Guide: Querying Aurora zero-ETL integrations, https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/zero-etl.querying.html
- Amazon Redshift Management Guide: Zero-ETL integrations, https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl-using.html
- Amazon Redshift Management Guide: Considerations when using zero-ETL integrations, https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl.reqs-lims.html
- Amazon Redshift Management Guide: Configure authorization for your Amazon Redshift data warehouse, https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl-using.redshift-iam.html
- Amazon Redshift Management Guide: Metrics for zero-ETL integrations, https://docs.aws.amazon.com/redshift/latest/mgmt/zero-etl-using.metrics.html
- Amazon Redshift Database Developer Guide: SVV_INTEGRATION, https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_INTEGRATION.html
- Amazon Redshift Database Developer Guide: CREATE DATABASE, https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_DATABASE.html
- AWS CLI Command Reference: RDS create-integration and describe-integrations, https://docs.aws.amazon.com/cli/latest/reference/rds/
- AWS CLI Command Reference: Redshift put-resource-policy, https://docs.aws.amazon.com/cli/latest/reference/redshift/put-resource-policy.html

## Issues Found
- The Aurora version prerequisites were too broad. Updated Aurora MySQL from "3.05 or later" to a supported version such as 3.05.2 or later, and Aurora PostgreSQL from "16.1 or later" to a supported version such as 16.4 or later.
- The prerequisites implied a generic provisioned Redshift cluster was sufficient. Clarified that provisioned targets must be supported, such as RA3 clusters.
- The prerequisites incorrectly required both resources to be in the same AWS account. Updated this to require the same Region, with cross-account supported through additional setup.
- The Aurora configuration section described MySQL binlog settings as if they applied to all Aurora engines. Clarified that those settings apply to Aurora MySQL and added the required Aurora PostgreSQL enhanced logical replication parameters.
- The Aurora MySQL parameter list omitted `binlog_row_metadata=full`, which is required for zero-ETL integrations. Added it.
- The Redshift setup section said the Serverless workgroup update allowed integrations. Corrected the wording: the command enables case-sensitive identifiers, while cross-account authorization is handled with a Redshift resource policy.
- The provisioned Redshift authorization command used a non-existent `aws redshift create-integration-authorization` command. Replaced it with `aws redshift put-resource-policy` and a policy containing `redshift:AuthorizeInboundIntegration` and `redshift:CreateInboundIntegration`.
- The integration status query referenced an `Errors` field that is not part of the RDS integration response shape. Replaced it with `IntegrationArn`.
- The CloudWatch monitoring example used the wrong namespace and metric name. Replaced the lag check with the documented `SVV_INTEGRATION.current_lag` query and updated the alarm example to use the Redshift `IntegrationLag` metric with the `IntegrationId` dimension.
- The table refresh SQL used `REFRESH TABLE`; Redshift uses `REFRESH TABLES`. Corrected the SQL.
- The data filter example omitted the terminating semicolon used in AWS filter expressions. Added it.
- The cost section mentioned cross-region data transfer even though Aurora zero-ETL integrations with Redshift require the source and target to be in the same Region. Replaced it with cross-Availability Zone transfer.
- The enhanced binlog storage estimate used an unsupported fixed percentage. Reworded it to state that storage usage can increase depending on retained change history.
- The traditional ETL comparison listed cross-account data movement as a reason to avoid zero-ETL, but cross-account zero-ETL is supported with authorization. Narrowed that point to cross-region data movement.

## Review Notes
The post remains a high-level setup guide. In a future update, it could add separate end-to-end paths for Aurora MySQL and Aurora PostgreSQL because source database naming, filtering requirements, and schema behavior differ by engine.
