# Validation Summary: How to Use Athena Federated Query to Query Multiple Data Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Athena
- Athena Federated Query
- Athena data source connectors
- AWS Glue Data Catalog federated connectors
- AWS Lambda
- AWS Serverless Application Repository
- AWS CloudFormation
- Amazon DynamoDB
- Amazon RDS / Aurora PostgreSQL
- AWS Secrets Manager
- SQL
- Java / Athena Query Federation SDK

## Sources Consulted
- Amazon Athena User Guide: Use Amazon Athena Federated Query - https://docs.aws.amazon.com/athena/latest/ug/federated-queries.html
- Amazon Athena User Guide: Available data source connectors - https://docs.aws.amazon.com/athena/latest/ug/connectors-available.html
- Amazon Athena User Guide: Use the AWS Serverless Application Repository to deploy a data source connector - https://docs.aws.amazon.com/athena/latest/ug/connect-data-source-serverless-app-repo.html
- Amazon Athena User Guide: Run federated queries - https://docs.aws.amazon.com/athena/latest/ug/running-federated-queries.html
- Amazon Athena User Guide: Amazon Athena DynamoDB connector - https://docs.aws.amazon.com/athena/latest/ug/connectors-dynamodb.html
- Amazon Athena User Guide: Amazon Athena PostgreSQL connector - https://docs.aws.amazon.com/athena/latest/ug/connectors-postgresql.html
- Amazon Athena User Guide: Develop a data source connector using the Athena Query Federation SDK - https://docs.aws.amazon.com/athena/latest/ug/connect-data-source-federation-sdk.html
- AWS CLI Command Reference: athena create-data-catalog - https://docs.aws.amazon.com/cli/latest/reference/athena/create-data-catalog.html
- AWS CLI Command Reference: serverlessrepo create-cloud-formation-change-set - https://docs.aws.amazon.com/cli/latest/reference/serverlessrepo/create-cloud-formation-change-set.html
- AWS Serverless Application Repository Developer Guide: Deploying a New Application with the AWS CLI - https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-consume.html
- AWS Athena Query Federation SDK repository and connector templates - https://github.com/awslabs/aws-athena-query-federation

## Issues Found
- The post described Athena Federated Query as exclusively Lambda-based. Current Athena documentation distinguishes Lambda-backed Athena data catalog connectors from AWS Glue Data Catalog federated connectors, and notes that some newly created connectors no longer require a Lambda function in the user's account. Updated the explanation while preserving the Lambda-based custom/SAR connector flow used by the tutorial.
- The Serverless Application Repository snippets used `create-cloud-formation-change-set` as if it directly deployed the connector. That command creates a CloudFormation change set; deployment requires `aws cloudformation execute-change-set`. Updated the DynamoDB and PostgreSQL deployment snippets to capture the change set ID, execute it, and wait for stack creation.
- The `--parameter-overrides` JSON used lowercase `name` and `value` keys. AWS CLI documentation specifies `Name` and `Value` for this structure. Updated the snippets.
- The post recommended the deprecated generic `AthenaJdbcConnector` for RDS. Current Athena documentation recommends database-specific connectors such as PostgreSQL, MySQL, Redshift, Oracle, and SQL Server. Updated the RDS example to use `AthenaPostgreSQLConnector` and its current CloudFormation parameters.
- The RDS section said "Register and query" but did not include a registration command. Added the corresponding `aws athena create-data-catalog` command.
- The DynamoDB section said the schema is always `default`. That is true for a simple connector setup, but the DynamoDB connector can use AWS Glue supplemental metadata databases. Updated the wording to avoid overstatement.
- The connector list included a generic JDBC connector as an active connector. Updated it to refer to database-specific JDBC connectors.
- The SQL comment for the PostgreSQL example still said "JDBC connector." Updated it to "PostgreSQL connector."

## Review Notes
- The Java custom connector snippet is illustrative rather than a complete compilable connector. The `RecordHandler`, `BlockSpiller.writeRows`, `ReadRecordsRequest`, `QueryStatusChecker`, and `Block.setValue` APIs are consistent with the Athena Query Federation SDK documentation, but a production connector also needs metadata and split handling.
- The local environment did not have the AWS CLI installed, so CLI behavior was verified against the current AWS CLI command reference and AWS documentation rather than by executing the commands locally.
