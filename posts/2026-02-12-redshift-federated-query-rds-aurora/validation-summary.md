# Validation Summary: How to Use Redshift Federated Query for RDS and Aurora

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Redshift federated queries
- Amazon RDS for PostgreSQL and MySQL
- Amazon Aurora PostgreSQL-Compatible and MySQL-Compatible
- AWS Secrets Manager
- AWS IAM roles and policies
- AWS CLI
- AWS CloudFormation
- Redshift SQL, external schemas, materialized views, and system views

## Sources Consulted
- Amazon Redshift: Querying data with federated queries in Amazon Redshift - https://docs.aws.amazon.com/redshift/latest/dg/federated-overview.html
- Amazon Redshift: Getting started with using federated queries to PostgreSQL - https://docs.aws.amazon.com/redshift/latest/dg/getting-started-federated.html
- Amazon Redshift: CREATE EXTERNAL SCHEMA - https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_EXTERNAL_SCHEMA.html
- Amazon Redshift: Creating a secret and an IAM role to use federated queries - https://docs.aws.amazon.com/redshift/latest/dg/federated-create-secret-iam-role.html
- Amazon Redshift: Considerations when accessing federated data with Amazon Redshift - https://docs.aws.amazon.com/redshift/latest/dg/federated-limitations.html
- Amazon Redshift: CREATE MATERIALIZED VIEW - https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-create-sql-command.html
- Amazon Redshift: SVL_FEDERATED_QUERY - https://docs.aws.amazon.com/redshift/latest/dg/r_SVL_FEDERATED_QUERY.html
- Amazon Redshift: SVV_EXTERNAL_SCHEMAS - https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_EXTERNAL_SCHEMAS.html
- Amazon Redshift: Quotas and limits in Amazon Redshift - https://docs.aws.amazon.com/redshift/latest/mgmt/amazon-redshift-limits.html
- Amazon Redshift: Turning on enhanced VPC routing - https://docs.aws.amazon.com/redshift/latest/mgmt/enhanced-vpc-enabling-cluster.html
- AWS CLI v2: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI v2: create-secret - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI v2: modify-cluster - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/redshift/modify-cluster.html
- AWS CloudFormation: AWS::SecretsManager::Secret - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-secretsmanager-secret.html

## Issues Found
- The introduction said federated queries involve "No data movement." AWS documents that Redshift retrieves result rows from the remote database and distributes them for further processing, so this was changed to "No separate ETL copy."
- The enhanced VPC routing guidance implied it should always be enabled. AWS documents enhanced VPC routing as required for some routing cases, such as cross-VPC connectivity, and notes that a Secrets Manager VPC endpoint may be needed when the cluster cannot reach the public endpoint. The wording was updated to reflect that.
- The IAM policy only granted `secretsmanager:GetSecretValue`. AWS's Redshift federated-query role examples include additional read/list actions for the secret, so the JSON and CloudFormation snippets were updated with the documented Secrets Manager actions.
- The monitoring query used `stl_query` as the primary federated-query details source. AWS documents `SVL_FEDERATED_QUERY` for federated query calls, so the query was changed to use `svl_federated_query`.
- The CloudFormation snippet referenced `${RDSPassword}` without defining the parameter. A `Parameters` block with `RDSPassword` and `NoEcho: true` was added.
- The limitations section claimed a default maximum of 10 external schemas per cluster. AWS documents 9,900 schemas in each database per cluster, so the limitation was corrected.

## Review Notes
The remaining SQL examples are illustrative and depend on application-specific table and column names. The federated-query setup syntax, supported database engines, Secrets Manager usage, read-only limitation for remote databases, materialized view usage, and external schema inspection query align with current AWS documentation.
