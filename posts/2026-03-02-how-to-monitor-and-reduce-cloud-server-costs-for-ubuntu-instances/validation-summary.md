# Validation Summary: How to Monitor and Reduce Cloud Server Costs for Ubuntu Instances

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- AWS CLI (Cost Explorer, EC2, CloudWatch, Compute Optimizer, Budgets)
- Ubuntu (`apt-get`)
- Linux performance tooling: `sysstat` / `sar`, `iostat`, `top`, `free`, `/proc/meminfo`, `ip`
- Bandwidth tools: `nethogs`, `iftop`
- `logrotate`
- Bash scripting and `cron`
- JMESPath (used in `--query` expressions)
- AWS EC2 services: EBS volumes (gp2/gp3), EBS snapshots, Spot Instances, NAT Gateways, Elastic IPs

## Sources Consulted
- AWS CloudWatch `GetMetricStatistics` API reference — https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html (verified `Period` has minimum value 1 with no documented maximum; 1,440 data-point cap applies, so single-datapoint periods like 1,209,600 s / 2,592,000 s are valid)
- AWS Compute Optimizer `InstanceRecommendationOption` reference — https://docs.aws.amazon.com/compute-optimizer/latest/APIReference/API_InstanceRecommendationOption.html (verified savings field path is `savingsOpportunity.savingsOpportunityPercentage`, not `estimatedMonthlySavings.percentage`)
- AWS CLI `budgets create-budget` reference — https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html (verified `CostFilters` accepts a `Service` key)
- AWS Cost Explorer dimension `SERVICE` value `"Amazon Elastic Compute Cloud - Compute"` is correct for filtering EC2 compute costs
- General knowledge of `logrotate(5)`, `sysstat`, and JMESPath built-in functions (`sum()`)

## Issues Found
1. **Incorrect JMESPath path in the AWS Compute Optimizer query.** The original post referenced `recommendationOptions[0].estimatedMonthlySavings.percentage`, but the field does not exist at that path. Per the Compute Optimizer API, the savings percentage lives at `recommendationOptions[0].savingsOpportunity.savingsOpportunityPercentage` (the sibling `estimatedMonthlySavings` is a `{currency, value}` object nested *inside* `savingsOpportunity`, and has no `percentage` member). Fixed by updating the `--query` expression to use the correct path.

## Review Notes
- The post installs the AWS CLI on Ubuntu with `sudo apt-get install -y awscli`. This pulls AWS CLI v1, which is in maintenance / end-of-support status as of mid-2024. All commands shown in the post are compatible with CLI v1, so the examples still work, but for new deployments AWS recommends installing CLI v2 from the official bundled installer. Not changed because it is a recommendation, not a correctness issue.
- The `--period 1209600` (14 days) and `--period 2592000` (30 days) values look unusual but are valid: the CloudWatch API only constrains `Period` by a 1,440-datapoint cap, and a single-datapoint request over the matching time range is permitted.
- The `aws ec2 describe-snapshots ... --query 'sum(Snapshots[*].VolumeSize)'` computes the sum of *provisioned* volume sizes, not the actual storage billed for snapshots (snapshot billing is based on changed-block storage, not parent volume size). The number is still useful as a rough upper-bound proxy, but readers should be aware it overstates actual snapshot storage costs.
- The `Service` value `"Amazon Elastic Compute Cloud - Compute"` is used in both the Cost Explorer filter and the Budgets `CostFilters`. The long form works for Cost Explorer; for AWS Budgets, the short form `"Amazon EC2"` is the more commonly documented value, though the long form is generally accepted. Left as-is since both are accepted.
- `sudo nethogs eth0` / `sudo iftop -i eth0` assume the primary interface is `eth0`. On modern Ubuntu cloud images, predictable interface names like `ens5` or `enX0` are common; readers may need to adjust.
