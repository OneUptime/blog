# Validation Summary: How to Create Target Tracking Scaling Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon EC2 Auto Scaling
- Target tracking scaling policies
- Amazon CloudWatch metrics and metric math
- Application Load Balancer target request metrics
- Amazon SQS queue metrics
- AWS CLI
- EC2 Instance Metadata Service

## Sources Consulted
- Terraform AWS Provider `aws_autoscaling_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy
- Terraform AWS Provider source documentation for `aws_autoscaling_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_policy.html.markdown
- Amazon EC2 Auto Scaling target tracking scaling policies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- Amazon EC2 Auto Scaling dynamic scaling and multiple policies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scale-based-on-demand.html
- Amazon EC2 Auto Scaling create target tracking scaling policy: https://docs.aws.amazon.com/autoscaling/ec2/userguide/policy_creating.html
- Amazon EC2 Auto Scaling predefined metric specification API reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_PredefinedMetricSpecification.html
- Amazon EC2 Auto Scaling target tracking with metric math: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-target-tracking-metric-math.html
- Amazon EC2 Auto Scaling SQS scaling guidance: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html
- AWS CLI `cloudwatch put-metric-data` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html
- Amazon EC2 instance metadata retrieval documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html

## Issues Found
- `estimated_instance_warmup` was placed inside `target_tracking_configuration` in several Terraform snippets. In the Terraform AWS provider, it is a top-level argument of `aws_autoscaling_policy`, so I moved it out of the nested block in each affected example.
- The custom metric section said target tracking can use any CloudWatch metric. AWS requires a suitable utilization metric whose value changes proportionally with Auto Scaling group capacity, so I narrowed the wording.
- The EC2 metadata example used IMDSv1. I updated it to request and use an IMDSv2 token so it works when IMDSv2 is required.
- The SQS metric math example used `Average` for `ApproximateNumberOfMessagesVisible` and had an incorrect queue-size label. AWS's metric math example uses `Sum` for the queue depth and divides it by `GroupInServiceInstances`, so I corrected the statistic, label, and surrounding text.
- The network output example described `500000000` as 500 MB/sec. Target tracking count or throughput targets are evaluated over a one-minute interval, so I changed the comment to 500 MB per minute.

## Review Notes
- The Terraform examples are snippets and reference resources such as launch templates, subnets, load balancers, and target groups that are not defined in the post. That is acceptable for a focused tutorial, but readers need those supporting resources in a real module.
- The Terraform provider documentation notes that omitting `desired_capacity` from an Auto Scaling group is often preferable when autoscaling policies manage capacity. The post's ASG example includes it as initial context; this is not syntactically invalid, but it is worth considering in a production module.
- The two OneUptime cross-links at the end of the post were reachable and point to related Auto Scaling articles.
