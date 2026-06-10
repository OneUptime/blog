# Validation Summary: How to Create Waste Reduction

## Status
validated

## Post Type
Guide / Tutorial — practical guide on cloud cost optimization and waste reduction strategies with implementation code.

## Technologies Covered
- AWS EC2, EBS, Elastic IPs, Snapshots
- AWS CloudWatch (metric statistics)
- AWS Lambda + EventBridge (CloudWatch Events) for scheduled resource start/stop
- AWS Budgets (CloudFormation)
- AWS Organizations Service Control Policies (SCPs)
- AWS SNS for alerting
- Python boto3 SDK
- KEDA (Kubernetes Event-Driven Autoscaling) cron scaler
- Terraform (aws_instance, timeadd, timestamp)
- NumPy (cost anomaly detection)
- pytz (timezone handling)
- Mermaid diagrams (pie, flowchart, gantt)

## Sources Consulted
- AWS boto3 EC2 client documentation (describe_instances, describe_volumes, describe_snapshots, describe_addresses, start_instances, stop_instances, create_snapshot, create_tags) — https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html
- AWS CloudWatch get_metric_statistics API — namespace AWS/EC2, metric CPUUtilization, Period multiples of 60
- AWS EventBridge / CloudWatch Events cron expressions (6-field format) — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html
- AWS EBS pricing (gp2, gp3, io1, io2, st1, sc1, standard) — https://aws.amazon.com/ebs/pricing/
- AWS EC2 on-demand pricing for us-east-1 (t3, m5, c5, r5 families) — https://aws.amazon.com/ec2/pricing/on-demand/
- AWS Elastic IP pricing ($0.005/hour for unassociated EIPs) — https://aws.amazon.com/vpc/pricing/
- AWS Budgets CloudFormation reference (AWS::Budgets::Budget) — https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-budgets-budget.html
- AWS Organizations SCP syntax (aws:RequestTag condition keys)
- KEDA cron scaler trigger specification — https://keda.sh/docs/scalers/cron/
- Terraform AWS provider aws_instance resource and built-in functions (timeadd, timestamp)
- Python datetime / pytz timezone-aware datetime handling

## Issues Found
No technical issues found.

All code examples are syntactically valid and use current, non-deprecated APIs:
- boto3 calls (describe_instances filters, get_metric_statistics, describe_addresses, describe_snapshots, create_tags) match the official SDK reference.
- AWS pricing figures (EC2 hourly, EBS per-GB-month, EIP at $0.005/hour, snapshot at ~$0.05/GB-month) are reasonable approximations for us-east-1, and the code itself notes they are simplified and recommends using the AWS Price List API in production.
- EIP monthly cost math is correct: $0.005 × 730 hours ≈ $3.65/month.
- EventBridge cron format `cron(0 8 ? * MON-FRI *)` is valid (6-field AWS cron with required `?` for day-of-month when day-of-week is specified).
- KEDA `ScaledObject` v1alpha1 with cron trigger uses correct field names (`timezone`, `start`, `end`, `desiredReplicas`).
- CloudFormation `AWS::Budgets::Budget` properties (BudgetName, BudgetType, TimeUnit, BudgetLimit, CostFilters with TagKeyValue, NotificationsWithSubscribers) match the AWS documentation; SubscriptionType values EMAIL and SNS are valid.
- AWS Organizations SCP using `Condition: Null` with `aws:RequestTag/<key>` is the documented pattern for requiring tags on resource creation.
- Terraform `timeadd(timestamp(), "${var.ttl_hours}h")` uses the correct duration format accepted by the timeadd function.
- Python `lambda_handler` guards against undefined `instance_ids` using `'instance_ids' in locals()` for the default action path.
- The safety logic in `OrphanedResourceCleaner.clean_unattached_volumes` correctly creates a final snapshot only when no recent snapshot already exists.

## Review Notes
- `datetime.utcnow()` is used in `analyze_ec2_utilization`. This function is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. The post uses the timezone-aware version elsewhere (`find_old_snapshots`, `OrphanedResourceCleaner`), so this is a minor inconsistency rather than an error. Both still work in current Python versions.
- Since February 2024, AWS charges $0.005/hour for **all** public IPv4 addresses (including attached EIPs and EC2 auto-assigned public IPs), not just unassociated EIPs. The post's statement that unassociated EIPs cost $0.005/hour is still factually correct, but readers should be aware the broader IPv4 charge now exists.
- The KEDA cron weekend trigger (`start: 0 0 * * 0,6` / `end: 0 0 * * 1`) uses an overlapping pattern that activates separately on Saturday and Sunday midnights; it works but a single trigger spanning Friday 6 PM → Monday 8 AM may be clearer in some configurations.
- EBS sc1 (Cold HDD) pricing in the article is listed as $0.025/GB-month; AWS has subsequently reduced sc1 pricing in some regions (e.g., $0.015/GB-month in us-east-1). The code's comment explicitly flags pricing as "simplified" with a recommendation to use the AWS Price List API in production, so this is acceptable as an educational approximation.
- The `t3.medium` instance type in the Terraform example and the broader instance-type tables are appropriate for dev environments.
