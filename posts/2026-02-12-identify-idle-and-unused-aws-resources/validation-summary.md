# Validation Summary: How to Identify Idle and Unused AWS Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2
- Amazon EBS volumes and snapshots
- Elastic Load Balancing
- Elastic IP addresses and public IPv4 pricing
- Amazon RDS
- NAT Gateways
- Amazon CloudWatch metrics
- AWS CLI
- Python and boto3

## Sources Consulted
- AWS CLI Command Reference: `ec2 describe-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: `ec2 describe-volumes` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI Command Reference: `ec2 describe-addresses` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-addresses.html
- AWS CLI Command Reference: `cloudwatch get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Amazon EC2 CloudWatch metrics - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Application Load Balancer CloudWatch metrics - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Network Load Balancer CloudWatch metrics - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-cloudwatch-metrics.html
- NAT Gateway CloudWatch metrics - https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html
- Amazon RDS CloudWatch metrics - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon VPC pricing for public IPv4 addresses and NAT Gateway charges - https://aws.amazon.com/vpc/pricing/
- Elastic Load Balancing pricing - https://aws.amazon.com/elasticloadbalancing/pricing/
- Amazon EBS pricing and snapshot storage notes - https://aws.amazon.com/ebs/pricing/

## Issues Found
- Changed the EC2 idleness explanation from treating low CPU as the most reliable signal to describing it as a common first indicator that should be checked with network and disk activity. CPU-only checks can miss network-heavy or disk-heavy workloads.
- Corrected the unattached EBS command comment. The command lists volume metadata but does not calculate estimated monthly cost.
- Softened EBS deletion guidance. An `available` volume is unattached, but deletion still requires ownership and data-retention checks.
- Updated load balancer pricing wording to distinguish hourly load balancer charges from LCU/NLCU usage charges.
- Changed the Network Load Balancer traffic metric from `ActiveFlowCount` to `ProcessedBytes`. AWS documents `ProcessedBytes` as a byte-volume metric with `Sum` as the useful statistic, which fits a zero-traffic check better than active connection concurrency.
- Updated Elastic IP wording to reflect current public IPv4 billing. AWS now charges the same $0.005/hour rate for idle and in-use public IPv4 addresses; unattached Elastic IPs are charged as idle public IPv4 addresses.
- Changed NAT Gateway cost wording from a fixed `$32/month` claim to an approximate amount for common US regions, because pricing varies by region and also includes data processing.
- Changed snapshot cost output to a rough upper-bound estimate. EBS snapshots are incremental, so summing `VolumeSize` can overstate actual billed snapshot storage.
- Corrected the all-in-one audit script description and docstring so it no longer claims to check every resource category.
- Updated the all-in-one audit script to exclude snapshots backing AMIs from the old snapshot cleanup candidate list.

## Review Notes
- The Python snippets parse successfully with `ast.parse`.
- AWS CLI is not installed in the local workspace, so CLI command validation was performed against the official AWS CLI command reference instead of local `--help` output.
- The sample scripts do not implement pagination for large AWS accounts. They are technically valid examples, but production tooling should use boto3 paginators or repeated CLI calls with pagination handling.
- The cost estimates remain intentionally rough and region-dependent. Exact estimates should use AWS Pricing Calculator, Cost Explorer, or account-specific pricing data.
