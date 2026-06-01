# Validation Summary: How to Use AWS CloudShell for Common Administrative Tasks

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- AWS CloudShell
- AWS CLI v2
- Amazon EC2
- Amazon S3
- AWS IAM
- AWS Lambda
- Amazon CloudWatch Logs and Metrics
- AWS CloudFormation
- AWS Cost Explorer
- AWS Resource Groups Tagging API

## Sources Consulted
- AWS CloudShell documentation: https://docs.aws.amazon.com/cloudshell/
- AWS CloudShell concepts and Region/persistent storage documentation: https://docs.aws.amazon.com/cloudshell/latest/userguide/working-with-aws-cloudshell.html
- AWS CloudShell compute environment documentation: https://docs.aws.amazon.com/cloudshell/latest/userguide/vm-specs.html
- AWS CLI EC2 describe-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI EC2 describe-instance-status command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-status.html
- AWS CLI S3 sync command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI Lambda invoke command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS Lambda CloudWatch metrics documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS CLI CloudWatch get-metric-data command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html
- Amazon CloudWatch Metrics Insights query examples: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-queryexamples.html
- AWS CLI Cost Explorer get-cost-and-usage command reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS CLI Resource Groups Tagging API get-resources command reference: https://docs.aws.amazon.com/cli/latest/reference/resourcegroupstaggingapi/get-resources.html
- JMESPath specification: https://jmespath.org/specification.html

## Issues Found
- EC2 instance status check used `describe-instance-status` without `--include-all-instances`. AWS CLI only returns running instances by default, so the check could return no status after stopping an instance. Added `--include-all-instances`.
- The EC2 section said it covered rebooting instances by name, but the example only covered start, stop, and status checks. Updated the sentence to match the commands shown.
- S3 large object query labeled the raw `Size` field as `SizeMB`, but S3 `Size` is returned in bytes. Renamed the output label to `SizeBytes`.
- Cost Explorer query compared `UnblendedCost.Amount` as if it were numeric, but the API returns the amount as a string. Added `to_number(...)` for filtering and sorting.
- The reusable script wrote to `~/scripts/health-check.sh` without ensuring `~/scripts` exists. Added `mkdir -p ~/scripts`.
- The Lambda error metric query in the health-check script requested `AWS/Lambda` `Errors` without the Lambda `FunctionName` dimension, which can miss the function-level metrics the script is trying to summarize. Replaced it with a Metrics Insights query over `SCHEMA("AWS/Lambda", FunctionName)`.
- The tag audit comment said it found all resources missing a required tag, but `resourcegroupstaggingapi get-resources` does not return untagged resources. Changed the comment to say it finds tagged resources missing the tag.

## Review Notes
- The Cost Explorer time period uses an exclusive `End` date, so `End=$(date +%Y-%m-%d)` reports month-to-date data through the previous date rather than including the current date. This is acceptable for a quick cost check because Cost Explorer data is not real time, but a future revision could mention the exclusive end-date behavior.
- The IAM credential report example uses a fixed `sleep 5`; in a production script, polling until the report is ready would be more robust.
