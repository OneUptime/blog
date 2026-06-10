# Validation Summary: How to Build Waste Identification

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Python 3 (boto3 SDK, dataclasses, typing)
- AWS EC2 (instances, EBS volumes, snapshots, Elastic IPs)
- AWS RDS
- AWS CloudWatch (metrics: AWS/EC2, AWS/RDS, AWS/ApplicationELB, CWAgent)
- AWS Elastic Load Balancing v2 (ALB)
- Kubernetes CronJob (batch/v1)
- Slack Block Kit (incoming webhooks)
- Mermaid diagrams (mindmap, flowchart, sequenceDiagram, graph)

## Sources Consulted
- boto3 EC2 client docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html
- boto3 RDS client docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds.html
- boto3 CloudWatch client docs (get_metric_statistics): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- boto3 ELBv2 client docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/elbv2.html
- AWS CloudWatch metrics for EC2: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/viewing_metrics_with_cloudwatch.html
- AWS CloudWatch Agent metrics namespace (CWAgent): https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch dimensions for ApplicationELB LoadBalancer (app/name/id format): https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS EC2 on-demand pricing (us-east-1, Linux): https://aws.amazon.com/ec2/pricing/on-demand/
- AWS EBS pricing: https://aws.amazon.com/ebs/pricing/
- AWS RDS pricing: https://aws.amazon.com/rds/pricing/
- AWS Elastic IP pricing: https://aws.amazon.com/ec2/pricing/on-demand/#Elastic_IP_Addresses
- AWS EBS snapshot pricing ($0.05/GB-month): https://aws.amazon.com/ebs/pricing/
- Kubernetes CronJob v1 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#cronjob-v1-batch
- Slack Block Kit reference: https://api.slack.com/reference/block-kit/blocks

## Issues Found
1. **Missing `import os`** — The `main()` function used `os.environ.get('SLACK_WEBHOOK_URL')` but `os` was never imported anywhere in the post's code blocks (a NameError would occur at runtime). Added `import os` to the top imports block so subsequent code blocks can use it.

## Review Notes
- `datetime.utcnow()` is used throughout. It is officially deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`, but it still works and remains the prevailing pattern in AWS SDK examples. Not changed.
- `get_metric_statistics` is called with `ExtendedStatistics=['p95', 'p99']` in `_get_instance_metrics`, but the response's `ExtendedStatistics` field is not consumed — the code instead computes p95 manually from `Average` datapoints. This is wasteful but not incorrect. Left as-is to preserve author's approach.
- `from typing import Tuple` is imported in the `WasteQuantifier` block but `Tuple` is never used. Unused import only — not a runtime issue.
- AWS EBS `sc1` is listed at $0.025/GB-month; current public pricing is $0.015/GB-month. The author labels these rates as "simplified" and says production code should use the AWS Price List API, so left as illustrative.
- Since Feb 2024 AWS charges $0.005/hour for *all* public IPv4 addresses (not only unattached EIPs). The post's "unattached EIP" framing is still correct for detection purposes; the cost calculation (0.005 × 730 = $3.65/month) remains accurate.
- ALB CloudWatch dimension parsing (`split('/')` then joining last three segments) correctly produces the `app/name/id` format CloudWatch expects.
- All CloudWatch namespaces (`AWS/EC2`, `AWS/RDS`, `AWS/ApplicationELB`, `CWAgent`) and metric names (`CPUUtilization`, `NetworkIn/Out`, `DatabaseConnections`, `FreeableMemory`, `RequestCount`, `mem_used_percent`) are accurate.
- All boto3 client method names, paginator names, and parameter shapes match the current SDK.
- Kubernetes CronJob `apiVersion: batch/v1` is correct (GA since Kubernetes 1.21).
- Slack Block Kit blocks (`header`, `section`, `divider`, `fields` with `mrkdwn`) match the current Block Kit schema.
