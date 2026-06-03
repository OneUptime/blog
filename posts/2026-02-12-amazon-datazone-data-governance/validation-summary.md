# Validation Summary: How to Set Up Amazon DataZone for Data Governance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DataZone
- AWS CLI
- AWS Glue Data Catalog
- Amazon Redshift
- Amazon Athena
- AWS Lake Formation
- AWS IAM
- AWS Resource Access Manager
- Amazon CloudWatch
- Amazon EventBridge
- AWS CloudTrail

## Sources Consulted
- AWS CLI Command Reference: `aws datazone create-domain` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-domain.html
- AWS CLI Command Reference: `aws datazone create-project` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-project.html
- AWS CLI Command Reference: `aws datazone create-project-membership` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-project-membership.html
- AWS CLI Command Reference: `aws datazone create-environment-profile` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-environment-profile.html
- AWS CLI Command Reference: `aws datazone create-environment` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-environment.html
- AWS CLI Command Reference: `aws datazone create-data-source` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-data-source.html
- AWS CLI Command Reference: `aws datazone create-glossary` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-glossary.html
- AWS CLI Command Reference: `aws datazone create-glossary-term` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-glossary-term.html
- AWS CLI Command Reference: `aws datazone create-subscription-request` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-subscription-request.html
- AWS CLI Command Reference: `aws datazone accept-subscription-request` - https://docs.aws.amazon.com/cli/latest/reference/datazone/accept-subscription-request.html
- AWS CLI Command Reference: `aws datazone create-subscription-target` - https://docs.aws.amazon.com/cli/latest/reference/datazone/create-subscription-target.html
- AWS CLI Command Reference: `aws datazone list-data-source-runs` - https://docs.aws.amazon.com/cli/latest/reference/datazone/list-data-source-runs.html
- Amazon DataZone User Guide: Approve or reject a subscription request - https://docs.aws.amazon.com/datazone/latest/userguide/approve-reject-subscription-request.html
- Amazon DataZone User Guide: Using existing IAM roles to fulfill subscriptions - https://docs.aws.amazon.com/datazone/latest/userguide/use-your-own-role.html
- Amazon DataZone User Guide: Monitoring Amazon DataZone - https://docs.aws.amazon.com/datazone/latest/userguide/monitoring-overview.html
- Amazon CloudWatch User Guide: AWS services that publish CloudWatch metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/aws-services-cloudwatch-metrics.html

## Issues Found
- The project membership example used `--designation CONTRIBUTOR`, which is not a valid Amazon DataZone membership designation. Changed it to `PROJECT_CONTRIBUTOR`, matching the AWS CLI enum.
- The Glue data source example omitted `--environment-identifier`, which identifies the environment where the data source publishes assets. Added an example environment identifier.
- The auto-approval section described `create-subscription-target` as an automatic approval rule and used unsupported parameters (`--subscribed-listing-asset-scope`) and type value (`DEFAULT`). Reworded the section to describe DataZone's documented automatic approval scenarios and changed the command to a valid Glue subscription target example for automatic grant fulfillment after approval.
- The monitoring example queried an undocumented `AWS/DataZone` CloudWatch namespace and `DataSourceRunsCompleted` metric. Replaced it with `aws datazone list-data-source-runs`, which is the documented CLI operation for checking data source run status.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI documentation rather than local `aws --help` output. The subscription target configuration is example-shaped and still depends on environment-specific IAM roles, database names, and associated-account setup.
