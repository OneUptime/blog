# Validation Summary: How to Scale CI/CD Runners with OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS Lambda
- Amazon EventBridge / CloudWatch Events
- Amazon EC2 Auto Scaling
- Amazon EKS managed node groups
- Kubernetes Cluster Autoscaler
- Helm
- Amazon CloudWatch dashboards and metrics
- AWS Cost Explorer tagging

## Sources Consulted
- Terraform AWS Provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, and `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS Provider `aws_autoscaling_schedule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_schedule
- Terraform AWS Provider `aws_eks_node_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform AWS Provider `aws_cloudwatch_dashboard`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon EventBridge schedule expressions: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon EC2 Auto Scaling scheduled scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- Amazon EKS managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Kubernetes Cluster Autoscaler AWS cloud provider docs: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Cluster Autoscaler Helm chart docs: https://github.com/kubernetes/autoscaler/blob/master/charts/cluster-autoscaler/README.md
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Amazon EC2 Fleet and Spot Fleet CloudWatch metrics: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-cloudwatch-metrics.html

## Issues Found
- The architecture diagram described target tracking, but the examples implement Lambda-based and scheduled scaling. Changed the diagram label to "Scaler / Lambda / Scheduled Actions".
- The scheduled scaling example had overlapping Friday 18:00 scheduled actions, which can create undefined or rejected scheduled action timing for one Auto Scaling group. Changed the weekday evening scale-down to Monday-Thursday and left the Friday action for weekend scale-to-zero.
- The scheduled scaling example used `UTC` for `time_zone`; AWS documents canonical IANA names such as `Etc/UTC`. Updated the schedules to `Etc/UTC`.
- The EKS node group put `k8s.io/cluster-autoscaler/enabled` in Kubernetes node labels. Cluster Autoscaler discovery and scale-from-zero scheduling data are based on Auto Scaling group tags, not ordinary node labels. Removed that label and added ASG node-template tags for the runner label and taint.
- The Spot node group example used only three instance types while the post recommends 5-6 diverse compatible types. Expanded the list to six same-shape compute-optimized instance types.
- The Helm chart values used non-existent top-level `scaleDownUnneededTime`, `scaleDownDelayAfterAdd`, and `scaleDownUtilizationThreshold` keys. Replaced them with `extraArgs` using the actual Cluster Autoscaler flag names.
- The CloudWatch dashboard titled an `AWS/EC2Spot` `AvailableInstancePoolsCount` metric as "Spot Instance Savings"; AWS documents that metric as an EC2 Fleet / Spot Fleet capacity-pool metric, not a savings metric for runner ASGs. Replaced it with Auto Scaling group pending and terminating capacity metrics.
- The best-practices bullet used the incorrect Helm-style key `scaleDownUnneededTime`. Updated it to the Cluster Autoscaler flag name `scale-down-unneeded-time`.
- The Lambda snippet was configured with GitHub-specific variables but the comment said GitHub/GitLab. Updated the comment to match the shown GitHub configuration.
- The Spot best-practices bullet implied diverse instance types always find capacity. Reworded it to avoid guaranteeing Spot availability.

## Review Notes
- The Lambda, ASG, IAM policy, and runner registration logic are intentionally partial snippets; a complete module still needs the referenced IAM roles, archive data source, ASG, and Lambda implementation.
- EventBridge scheduled rules still work, but AWS now describes scheduled rules as a legacy scheduling feature and recommends EventBridge Scheduler for new scheduled tasks.
- In a production EKS deployment, the Cluster Autoscaler image and chart version should be selected to match the Kubernetes cluster version.
- The CloudWatch Auto Scaling group metrics shown in the dashboard require group metrics collection to be enabled on the ASG.
