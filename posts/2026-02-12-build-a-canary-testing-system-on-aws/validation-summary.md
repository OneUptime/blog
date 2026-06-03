# Validation Summary: How to Build a Canary Testing System on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon CloudWatch Synthetics
- AWS Lambda
- AWS CloudFormation
- Amazon CloudWatch metrics and alarms
- AWS CodeDeploy
- Amazon SNS
- AWS Secrets Manager
- Amazon S3
- IAM
- Node.js
- Python
- Boto3

## Sources Consulted
- AWS CloudWatch Synthetics runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library.html
- AWS CloudWatch Synthetics Node.js Puppeteer runtimes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- AWS CloudWatch Synthetics runtime support policy and deprecation dates: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Runtime_Support_Policy.html
- Writing a Node.js canary script using the Puppeteer runtime: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Nodejs_Pup.html
- CloudWatch metrics published by canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_metrics.html
- AWS::Synthetics::Canary CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-synthetics-canary.html
- AWS::Synthetics::Canary Schedule CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-synthetics-canary-schedule.html
- Required roles and permissions for CloudWatch Synthetics canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_CanaryPermissions.html
- Boto3 Synthetics create_canary reference: https://docs.aws.amazon.com/boto3/latest/reference/services/synthetics/client/create_canary.html
- CodeDeploy ListDeployments API reference: https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_ListDeployments.html
- Boto3 CodeDeploy stop_deployment reference: https://docs.aws.amazon.com/botocore/latest/reference/services/codedeploy/client/stop_deployment.html
- CodeDeploy CloudWatch alarm monitoring and rollback documentation: https://docs.aws.amazon.com/codedeploy/latest/userguide/monitoring-create-alarms.html
- CodeDeploy AutoRollbackConfiguration API reference: https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_AutoRollbackConfiguration.html
- Invoking Lambda from a CloudWatch alarm: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-actions-Lambda.html

## Issues Found
- The post said canaries can be written in Node.js or Python, but CloudWatch Synthetics also supports Java. Updated the statement to include Java.
- The CloudFormation and Boto3 examples used `syn-nodejs-puppeteer-6.2`, which AWS deprecated on January 22, 2026. Updated examples to `syn-nodejs-puppeteer-15.1`, the current documented Node.js Puppeteer runtime.
- The Node.js snippets used legacy Synthetics package names (`Synthetics` and `SyntheticsLogger`). Updated them to the current package namespaces used by newer runtimes: `@aws/synthetics-puppeteer` and `@aws/synthetics-logger`.
- The examples put canary credentials directly in environment variables. AWS documentation warns not to store sensitive information in canary environment variables, so the examples now pass a Secrets Manager secret identifier and retrieve credentials at runtime with AWS SDK for JavaScript v3.
- The canary execution role used the broad user-facing `CloudWatchSyntheticsFullAccess` managed policy and had incomplete execution permissions. Replaced it with scoped inline execution permissions for S3 artifacts, CloudWatch Logs, and Secrets Manager.
- The rollback Lambda snippet missed `datetime` imports, used an EventBridge-style alarm payload, and included succeeded deployments that cannot be stopped. Updated it for the direct CloudWatch alarm-to-Lambda event shape, timezone-aware datetime handling, and stoppable deployment statuses.
- The CloudWatch alarm example invoked Lambda without granting CloudWatch permission to invoke the function. Added an `AWS::Lambda::Permission` resource using the CloudWatch alarm service principal.
- The multi-region Boto3 example used a 9-digit placeholder account ID, did not start newly created canaries, and did not pass the required secret identifier after the credentials change. Corrected the account ID, added `start_canary`, and added the environment variable.

## Review Notes
The examples are still intentionally illustrative and use placeholder domains, bucket names, secret names, and resource names. In production, each referenced S3 bucket, secret, Lambda function, CodeDeploy application, deployment group, and IAM role must exist in the target account and region, and the CodeDeploy deployment group should be configured for rollback behavior that matches the deployment strategy.
