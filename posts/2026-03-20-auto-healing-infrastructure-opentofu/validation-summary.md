# Validation Summary: How to Set Up Auto-Healing Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Auto Scaling Groups
- AWS CloudWatch alarms
- Amazon EC2 instance recovery
- Kubernetes Deployments
- Kubernetes Horizontal Pod Autoscaler
- Amazon RDS Multi-AZ
- Amazon EventBridge

## Sources Consulted
- AWS provider `aws_autoscaling_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_db_instance` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_cloudwatch_event_rule` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown
- AWS provider `aws_cloudwatch_event_target` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_target.html.markdown
- Kubernetes provider `kubernetes_deployment` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment.md
- Kubernetes provider `kubernetes_deployment_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- Kubernetes provider `kubernetes_horizontal_pod_autoscaler_v2` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/horizontal_pod_autoscaler_v2.md
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod lifecycle docs: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- AWS EC2 alarm actions guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UsingAlarmActions.html
- AWS EC2 CloudWatch recovery guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cloudwatch-recovery.html
- Amazon RDS Multi-AZ failover docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS event categories and event messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Amazon EventBridge reference for RDS events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- AWS prescriptive guidance for RDS EventBridge rules: https://docs.aws.amazon.com/prescriptive-guidance/latest/amazon-rds-monitoring-alerting/eventbridge-rules.html

## Issues Found
- The Auto Scaling Group example used `version = "$Latest"` in the `launch_template` block while also relying on `instance_refresh`. The AWS provider docs state that an instance refresh does not start when `"$Latest"` is configured there, so I changed it to `aws_launch_template.app.latest_version`.
- The Step 1 heading and comment used "instance recovery" and "circuit breaker" terminology for an Auto Scaling Group example that actually performs instance replacement and optional refresh rollback. I corrected those labels to match AWS behavior.
- The EC2 recovery alarm had duplicate `alarm_actions` arguments, which is invalid HCL. I merged them into a single list, switched the recovery ARN to the current region with `data.aws_region.current`, and added `treat_missing_data = "missing"` to follow AWS guidance for EC2 recovery alarms.
- The EC2 recovery section implied the pattern applied generally, but AWS documents CloudWatch action-based recovery as a feature for supported standalone instances. I clarified that in the section heading, comment, and summary.
- The Kubernetes Deployment was missing the required `spec.selector` and matching pod-template labels. I added the selector and template metadata labels so the Deployment spec is valid for `apps/v1` and for the Kubernetes provider resource.
- The HPA comment said it "ensures desired replicas maintained," which is imprecise. The Deployment controller maintains desired replica count; HPA adjusts that count within min/max bounds based on metrics. I corrected the comment.
- The RDS instance example omitted required creation arguments for `aws_db_instance`, including storage allocation and master credentials management. I added `allocated_storage`, `username`, and `manage_master_user_password` so the example is viable.
- The Enhanced Monitoring comment incorrectly implied it speeds failure detection. AWS uses it for OS-level metrics and troubleshooting, so I corrected that description.
- The RDS failover section labeled the example as a CloudWatch alarm even though it uses an EventBridge rule. I corrected the wording, scoped the event pattern to the example DB instance with `SourceArn`, and added an `aws_cloudwatch_event_target` so matching failover events are actually routed to the alerts topic.
- The summary overclaimed that EC2 recovery occurs "without data loss" and that the combined setup resolves failures "without paging on-call engineers." AWS notes that RAM and instance-store data are lost during recovery, and alerting is still advisable, so I replaced those statements with narrower, accurate wording.

## Review Notes
- The post is technically correct after the fixes above.
- If OpenTofu is used to manage the Kubernetes Deployment continuously alongside an HPA, future applies may intentionally reassert the configured `replicas` value unless the team's workflow accounts for that drift.
- If the SNS topic used as the EventBridge target does not already allow EventBridge to publish to it, an `aws_sns_topic_policy` is also required.
