# Validation Summary: How to Create CloudWatch Synthetics Canaries with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS
- Amazon CloudWatch Synthetics
- Amazon S3
- AWS IAM
- Amazon CloudWatch Alarms
- AWS CLI
- JavaScript (Node.js)

## Sources Consulted
- AWS CloudWatch Synthetics runtime versions using Node.js and Puppeteer: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- AWS CloudWatch Synthetics runtime versions using Node.js: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_Nodejs.html
- AWS CloudWatch Synthetics canary packaging and handler layout for Puppeteer runtimes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Nodejs_Pup.html
- AWS CloudWatch Synthetics library functions for Node.js canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Library_function_Nodejs.html
- AWS required IAM roles and permissions for canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_CanaryPermissions.html
- AWS CloudWatch metrics published by canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_metrics.html
- AWS CLI `describe-canaries-last-run` command reference: https://docs.aws.amazon.com/cli/latest/reference/synthetics/describe-canaries-last-run.html
- Terraform AWS Provider `aws_synthetics_canary` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/synthetics_canary
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The S3 bucket name example referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. I added the missing data source so the snippet is internally consistent.
- The IAM policy was missing `s3:GetObject` and `s3:ListAllMyBuckets`, which AWS documents as required for a basic canary execution role. I added those actions and separated bucket-level and object-level S3 permissions to match AWS guidance more closely.
- The canary used `syn-nodejs-puppeteer-7.0`, which AWS lists as deprecated as of January 22, 2026. I updated the example to `syn-nodejs-puppeteer-15.0`, which AWS documents as the current runtime.
- The JavaScript example used legacy `Synthetics` and `SyntheticsLogger` imports and an undocumented `makeHttpRequest` pattern for the current runtime family. I migrated the example to the current namespaces, `@aws/synthetics-puppeteer` and `@aws/synthetics-logger`, and rewrote the HTTP check to use the documented `executeHttpStep` API.
- The ZIP packaging command and file path did not match AWS’s required canary package structure. I updated the example to package `nodejs/node_modules/apiCanary.js` with `zip -r api_canary.zip nodejs/`, which matches AWS’s supported packaging layout for Puppeteer canaries.
- The post description claimed the tutorial showed multi-region deployment, but the body only demonstrated a single-region canary. I narrowed the description so it matches the actual implementation shown.

## Review Notes
- The tutorial now targets `syn-nodejs-puppeteer-15.0`, but CloudWatch Synthetics runtime versions change regularly. Future reviews should re-check the runtime matrix before publication.
- The post assumes shared variables such as `var.project_name` and `var.sns_topic_arn` are defined elsewhere in the OpenTofu configuration.
