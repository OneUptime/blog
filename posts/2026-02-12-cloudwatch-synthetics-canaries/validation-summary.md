# Validation Summary: How to Set Up CloudWatch Synthetics Canaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Synthetics
- AWS Lambda
- AWS CLI
- AWS CloudFormation
- Amazon S3
- Amazon CloudWatch alarms and metrics
- IAM execution roles
- Node.js canary scripts

## Sources Consulted
- Amazon CloudWatch Synthetics overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
- CloudWatch Synthetics Node.js library functions, including `executeHttpStep`: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Library_function_Nodejs.html
- CloudWatch Synthetics Node.js and Puppeteer runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- AWS CLI `synthetics create-canary` command reference: https://docs.aws.amazon.com/cli/latest/reference/synthetics/create-canary.html
- CloudFormation `AWS::Synthetics::Canary` resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-synthetics-canary.html
- CloudFormation `AWS::Synthetics::Canary Code` property reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-synthetics-canary-code.html
- Required IAM roles and permissions for CloudWatch Synthetics canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_CanaryPermissions.html
- CloudWatch metrics published by canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_metrics.html
- AWS CLI `cloudwatch put-metric-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The API canary examples used `response.body`, but AWS documents the callback response for `executeHttpStep` as a Node.js `http.IncomingMessage`. Updated the examples to read the response body from the response stream before parsing JSON.
- The API canary used undocumented `synthetics.setStepData` and `synthetics.getStepData` helpers. Replaced them with a local `token` variable scoped to the canary run.
- The latency example expected `stepConfig.stepDuration` from the callback arguments, but `executeHttpStep` documents only the response callback parameter. Updated the example to measure elapsed time around the HTTP step.
- The heartbeat canary URL handling dropped query strings because it used only `pathname`. Updated request option construction to include both `pathname` and `search`.
- The examples referenced `syn-nodejs-puppeteer-9.0`; updated them to `syn-nodejs-puppeteer-9.1`, the patched runtime in the same major line shown in current AWS CLI examples.
- The CloudFormation role used the `CloudWatchSyntheticsFullAccess` managed policy as an execution role policy. Replaced it with inline execution-role permissions matching AWS's documented canary role requirements.
- The standalone IAM policy used `s3:ListBucket`, but AWS documents `s3:GetBucketLocation` plus `s3:ListAllMyBuckets` for basic canary execution. Updated the permissions and added `xray:PutTraceSegments`.
- The scheduling section said to omit a schedule for manual-only runs, but the Synthetics create-canary API requires `Schedule`. Updated the example to use `rate(0 minute)`, which AWS documents for one-time/manual runs.
- The CloudFormation S3 bucket name used only the account ID, which can collide when deploying to multiple Regions in the same account. Added `${AWS::Region}` to the bucket name.

## Review Notes
- Current AWS documentation lists newer Synthetics runtimes than `syn-nodejs-puppeteer-9.1`. The examples remain valid for the supported 9.x runtime line and avoid the namespace migration required by `syn-nodejs-puppeteer-13.1` and later.
- The local workspace does not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
