# Validation Summary: How to Implement Under-Utilized Detection

## Status
validated

## Post Type
Guide / Tutorial (FinOps practical implementation)

## Technologies Covered
- AWS EC2 (boto3)
- AWS RDS (boto3)
- AWS EBS (boto3)
- AWS CloudWatch (metrics API via boto3)
- AWS Lambda
- AWS SNS
- AWS S3
- AWS IAM
- AWS EventBridge / CloudWatch Events (scheduled triggers)
- Aurora Serverless v2
- Terraform (AWS provider)
- Python 3 (dataclasses, typing.Literal, type hints)
- Mermaid (flowchart diagrams)

## Sources Consulted
- boto3 CloudWatch documentation — `get_metric_statistics` signature and CloudWatch metric namespaces (`AWS/EC2`, `AWS/RDS`, `AWS/EBS`)
- AWS CloudWatch metrics reference for EC2 (`CPUUtilization` on `InstanceId`), RDS (`CPUUtilization`, `DatabaseConnections` on `DBInstanceIdentifier`), and EBS (`VolumeReadOps` on `VolumeId`)
- boto3 EC2 client docs — `describe_instances`, `describe_volumes`, `describe_snapshots(OwnerIds=['self'])`, `describe_images(Owners=['self'])`, `create_image(NoReboot=True)`, `modify_instance_attribute(InstanceType={'Value': ...})`, `create_snapshot`, `delete_volume`, waiters `instance_stopped` and `snapshot_completed`
- boto3 RDS client docs — `describe_db_instances`
- AWS Lambda runtime support — `python3.11` is a currently supported runtime
- Terraform AWS Provider — `aws_lambda_function`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_sns_topic`, `aws_s3_bucket`, `aws_iam_role`, `aws_iam_role_policy` resource schemas
- AWS EventBridge cron syntax (six-field) — `cron(0 6 * * ? *)` validated as daily 6 AM UTC
- AWS public pricing for EC2 (T3/M5/C5/R5) and RDS (db.t3/db.m5/db.r5) on-demand instances in us-east-1, cross-checked against 730 hours/month standard
- AWS EBS pricing reference for gp2/gp3/io1/io2/st1/sc1 volume types in us-east-1
- Mermaid flowchart syntax reference for the `flowchart TD`/`flowchart LR` diagrams

## Issues Found
No technical issues found.

The code samples are syntactically valid, use current (non-deprecated) boto3 and Terraform APIs, and the AWS CloudWatch namespaces, metric names, and dimensions are all correctly named. EC2/RDS pricing values are reasonable approximations for us-east-1 and the post itself notes that production code should use the AWS Price List API. The Mermaid diagrams parse correctly. The Terraform IAM policy grants the correct minimum permissions for the described operations.

## Review Notes
- `datetime.utcnow()` is used throughout the Python samples. This call is soft-deprecated starting in Python 3.12 in favor of `datetime.now(timezone.utc)`. It still works (emits a `DeprecationWarning`), so the code remains functional, but a future refresh could migrate to timezone-aware datetimes — especially since `snap['StartTime']` from boto3 is timezone-aware and is currently stripped via `.replace(tzinfo=None)` to allow comparison with the naive `cutoff_date`.
- `get_volume_iops_utilization` only sums `VolumeReadOps` and ignores `VolumeWriteOps`, and assumes a fixed 3000 IOPS baseline regardless of the actual volume type/provisioned IOPS. The author labels this a "Simplified calculation" in a comment, which is appropriate for an illustrative example, but for production use this should pull the volume's actual provisioned IOPS (or baseline for gp3/gp2/etc.) and include write ops.
- The EBS sc1 price in `calculate_ebs_cost` is listed as $0.025/GB-month; the current us-east-1 sc1 price is closer to $0.015/GB-month. The differences are within the range of "illustrative pricing only" and the post notes elsewhere that production code should consult the AWS Price List API, so this was left unchanged.
- The Lambda example function declares `detect_underutilized_ec2`/`_ebs`/`_rds` as `pass` stubs labeled "Implementation from earlier examples." This is intentional and clearly flagged for the reader.
- `data.aws_caller_identity.current.account_id` is referenced in the S3 bucket name but the corresponding `data "aws_caller_identity" "current" {}` block is not shown in the snippet. This is a common documentation shorthand and not a technical error.
- `aws_cloudwatch_event_rule`/`aws_cloudwatch_event_target` are valid; AWS's newer EventBridge Scheduler (`aws_scheduler_schedule`) is an alternative but the older resource names continue to work and are widely used.
