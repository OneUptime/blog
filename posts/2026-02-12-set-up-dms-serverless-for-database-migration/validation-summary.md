# Validation Summary: How to Set Up DMS Serverless for Database Migration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Database Migration Service (DMS) Serverless
- AWS DMS endpoints and replications
- AWS IAM roles and managed policies
- AWS VPC subnet groups and security groups
- AWS CLI
- AWS Secrets Manager
- Amazon CloudWatch metrics
- Change Data Capture (CDC)

## Sources Consulted
- AWS DMS Serverless user guide: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Serverless.html
- AWS DMS Serverless components and supported endpoints: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Serverless.Components.html
- AWS DMS Serverless limitations: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Serverless.Limitations.html
- AWS CLI `create-replication-config` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-config.html
- AWS CLI `start-replication` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/start-replication.html
- AWS CLI `create-endpoint` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- AWS CLI `create-replication-subnet-group` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-subnet-group.html
- AWS CLI `describe-replications` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/describe-replications.html
- AWS DMS VPC role documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DMS_migration-IAM.dms-vpc-role.html
- AWS DMS LOB support documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.LOBSupport.html
- AWS DMS best practices for limited LOB mode: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html
- AWS DMS pricing page: https://aws.amazon.com/dms/pricing/
- AWS Price List API for AWS Database Migration Service in us-east-1: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDatabaseMigrationSvc/current/us-east-1/index.json

## Issues Found
- The introduction claimed migrations could be done "without downtime." Changed this to "with minimal downtime" to match AWS DMS positioning and avoid overpromising.
- The Mermaid diagram listed a maximum DMS Serverless capacity of 128 DCUs. Current AWS documentation lists valid DCU values up to 384, so the diagram was updated to 384.
- Two JSON code blocks contained `//` comments, which made them invalid JSON if copied into files. Removed the comments from the IAM trust policy and table mapping snippets.
- The Secrets Manager guidance was imprecise. Updated it to state that DMS endpoint configurations use a Secrets Manager access role ARN and secret ID.
- The security group pitfall only mentioned outbound access from the DMS replication security group. Added the matching inbound requirement on the database security groups.
- The cost example was outdated. Updated the us-east-1 Single-AZ DMS Serverless price from about $0.018 per DCU-hour to about $0.0819 per DCU-hour, corrected the 4 DCU / 10 hour estimate to about $3.28, and updated the Single-AZ `dms.r5.large` comparison from $0.29/hour to $0.176/hour based on the AWS Price List API.
- The long-running CDC wording implied general 24/7 post-migration use. Adjusted it to refer to long-running CDC during a migration, consistent with AWS pricing guidance that DMS continuous replication is for migrations.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI command validation was performed against the official AWS CLI command reference instead of local `--help` output. The internal OneUptime links point to existing local post directories.
