# Validation Summary: How to Use AppConfig for Dynamic Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppConfig
- AWS CLI
- AWS Lambda
- JSON Schema
- AWS Systems Manager Parameter Store
- Amazon S3
- Amazon CloudWatch alarms
- Python

## Sources Consulted
- AWS AppConfig User Guide: Understanding validators: https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-validators.html
- AWS CLI Command Reference: appconfig create-configuration-profile: https://docs.aws.amazon.com/cli/latest/reference/appconfig/create-configuration-profile.html
- AWS CLI Command Reference: appconfig create-hosted-configuration-version: https://docs.aws.amazon.com/cli/latest/reference/appconfig/create-hosted-configuration-version.html
- AWS CLI Command Reference: appconfig create-deployment-strategy: https://docs.aws.amazon.com/cli/latest/reference/appconfig/create-deployment-strategy.html
- AWS CLI Command Reference: appconfig start-deployment: https://docs.aws.amazon.com/cli/latest/reference/appconfig/start-deployment.html
- AWS CLI Command Reference: appconfig update-environment: https://docs.aws.amazon.com/cli/latest/reference/appconfig/update-environment.html
- AWS AppConfig User Guide: Monitoring deployments for automatic rollback: https://docs.aws.amazon.com/appconfig/latest/userguide/monitoring-deployments.html
- AWS AppConfig User Guide: Using AWS AppConfig Agent with EC2 and on-premises machines: https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-ec2.html
- Elastic Load Balancing User Guide: CloudWatch metrics for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The `create-hosted-configuration-version` examples omitted the required CLI output file and used `file://` for a blob parameter. Changed them to use `fileb://...` and added output filenames so they work with AWS CLI v2 binary blob handling.
- The inline JSON Schema example used draft-07. AWS AppConfig inline JSON Schema validators support JSON Schema 4.x, so the schema URI was changed to draft-04.
- The Lambda validator parsed `event['content']` as plain JSON. AWS AppConfig sends validator content as a base64-encoded string, so the example now base64-decodes the content before parsing JSON.
- The SSM Parameter Store configuration profile example omitted `--retrieval-role-arn`. Added an AppConfig retrieval role ARN placeholder because AppConfig needs a role to retrieve non-hosted configuration sources such as SSM parameters.
- The CloudWatch alarm example used `5XXError` in the `AWS/ApplicationELB` namespace. For Application Load Balancers, the documented target 5xx metric is `HTTPCode_Target_5XX_Count`, so the metric name, statistic, and representative ALB dimensions were corrected.

## Review Notes
- The AWS CLI was not installed in the local workspace, so command validation was performed against the current official AWS CLI v2 command reference and AWS service documentation.
- The AppConfig Agent example is intentionally simple. In production, applications should consider request timeouts, startup behavior when no configuration has been fetched yet, and how often to poll the local agent.
