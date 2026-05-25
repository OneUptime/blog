# Validation Summary: How to Create CloudWatch Synthetics Canaries in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- AWS CloudWatch Synthetics
- AWS CloudWatch alarms
- AWS IAM
- Amazon S3
- Amazon SNS
- Node.js
- Puppeteer-based Synthetics canary scripts

## Sources Consulted
- AWS CloudWatch Synthetics canary permissions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_CanaryPermissions.html
- AWS CloudWatch Synthetics Node.js Puppeteer runtime versions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
- AWS CloudWatch Synthetics Node.js Puppeteer script packaging and handler docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Nodejs_Pup.html
- AWS CloudWatch Synthetics Node.js library functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library_Nodejs.html
- Terraform AWS provider `aws_synthetics_canary` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/synthetics_canary
- Terraform Local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file

## Issues Found
- The post used `syn-nodejs-puppeteer-7.0`, which AWS now lists under deprecated Synthetics runtimes. Updated the canary examples to `syn-nodejs-puppeteer-15.1`.
- The heartbeat script used legacy Synthetics module names (`Synthetics` and `SyntheticsLogger`) while the updated runtime uses the new scoped package names. Updated the imports to `@aws/synthetics-puppeteer` and `@aws/synthetics-logger`.
- The Terraform configuration used `archive_file` and `local_file` without declaring their providers. Added `hashicorp/archive` and `hashicorp/local` to `required_providers`.
- The API canary resource referenced `data.archive_file.api_canary.output_path`, but that archive data source and its script were missing. Added a minimal API canary script using `executeHttpStep` and the matching `archive_file` data source.
- The canary IAM policy was missing AWS-documented basic-canary permissions for `s3:ListAllMyBuckets` and `xray:PutTraceSegments`. Added them to the example policy.
- The description claimed canaries test from "multiple locations," which is misleading unless the user creates canaries in multiple AWS Regions. Updated it to say AWS-managed infrastructure.
- The "Multiple Endpoint Monitoring" snippet said it was monitoring with `for_each`, but the snippet only defines endpoint inputs. Adjusted the comment to describe it as input for use with `for_each`.

## Review Notes
Terraform CLI is not installed in this workspace, so I could not run `terraform validate` locally. The edited snippets were reviewed against official AWS and HashiCorp documentation.
