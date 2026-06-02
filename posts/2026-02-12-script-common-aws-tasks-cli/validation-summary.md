# Validation Summary: How to Script Common AWS Tasks with the CLI

## Status
validated

## Post Type
Tutorial / practical scripting guide

## Technologies Covered
- AWS CLI
- Bash scripting
- Amazon EC2
- Amazon EBS
- Elastic IP addresses and public IPv4 charges
- Amazon S3 storage metrics
- Amazon CloudWatch and CloudWatch Logs
- AWS Cost Explorer
- AWS CloudFormation
- JMESPath queries

## Sources Consulted
- AWS CLI Command Reference: `ec2 describe-volumes` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI Command Reference: `ec2 describe-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: `ec2 describe-security-groups` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI Command Reference: `cloudwatch get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Amazon S3 User Guide: Metrics and dimensions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- AWS CLI Command Reference: `logs filter-log-events` - https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- AWS CLI Command Reference: `ce get-cost-and-usage` - https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS CLI Command Reference: `cloudformation deploy` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- Amazon EC2 User Guide: Elastic IP addresses - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- GNU Bash manual: The Set Builtin - https://www.gnu.org/software/bash/manual/bash.html#index-set

## Issues Found
- The S3 bucket size script described the report as total bucket size and cost, but it queried only the `StandardStorage` CloudWatch dimension for `BucketSizeBytes`. I updated the section title, script name, comments, and column label to clarify that it reports S3 Standard storage only.
- The S3 script used `Datapoints[0].Average` from `get-metric-statistics`. AWS documents that CloudWatch datapoints are not returned in chronological order, so I changed the query to `sort_by(Datapoints, &Timestamp)[-1].Average` to select the latest datapoint.
- The S3 cost comment implied a universal S3 Standard price. I clarified that `$0.023/GB/month` is the us-east-1 first-50-TB tier estimate, because S3 pricing varies by region and tier.
- The Elastic IP output text stated that unassociated Elastic IPs cost `$3.65/month each`. AWS now charges for all Elastic IP addresses whether in use or idle, and exact monthly totals vary by hours in the month. I changed the text to state that public IPv4 charges apply.
- The security group auditor checked only IPv4 world-open ingress rules (`0.0.0.0/0`). I updated the query and heading to also include IPv6 world-open ingress rules (`::/0`).
- The Cost Explorer script used today's date as the `End` value, but Cost Explorer treats the end date as exclusive. I changed it to send tomorrow's date to the API while still displaying today's date to the user.
- The CloudFormation script ran `wait $DEPLOY_PID` under `set -e`, which would exit immediately on deployment failure before showing recent failed events. I wrapped `wait` in an `if` statement so the script can capture the exit code and print the failure diagnostics.

## Review Notes
- The AWS CLI was not installed in the local environment, so command option validation was performed against the official AWS CLI command reference rather than local `--help` output.
- Bash syntax validation was performed by extracting the fenced Bash snippets from the post and running `bash -n` over the combined snippets.
- The OneUptime and GitHub links in the post returned HTTP 200 during review.
