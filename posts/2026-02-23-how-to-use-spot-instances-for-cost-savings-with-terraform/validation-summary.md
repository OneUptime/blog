# Validation Summary: How to Use Spot Instances for Cost Savings with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS EC2 Spot Instances
- AWS Auto Scaling Groups with mixed instances policies
- AWS EC2 Fleet
- Amazon EKS managed node groups
- Amazon EventBridge / CloudWatch Events
- AWS Lambda
- Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation for `aws_spot_instance_request`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_instance_request
- Terraform AWS provider documentation for `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider documentation for `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider documentation for `aws_ec2_fleet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_fleet
- Terraform AWS provider documentation for `aws_eks_node_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform AWS provider documentation for `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider documentation for `aws_sns_topic_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- AWS EC2 Spot Instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html
- AWS EC2 Auto Scaling mixed instances groups documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html
- AWS EC2 Fleet documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet.html
- AWS EventBridge EC2 Spot interruption events documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html

## Issues Found
- The Auto Scaling Group example configured Spot market options directly in the launch template while also using a mixed instances policy with an on-demand baseline. I removed the launch template Spot market block so the ASG mixed instances policy controls the Spot and On-Demand distribution.
- The batch workload example used `aws_spot_fleet_request`, a legacy Spot Fleet API path that the Terraform AWS provider documentation now discourages for new configurations. I replaced it with `aws_ec2_fleet` and a launch template using Spot target capacity and a current `price-capacity-optimized` allocation strategy.
- The EventBridge event pattern used `detail_type`, but EventBridge event patterns require the JSON field name `detail-type`. I corrected the key.
- The EventBridge targets for Lambda and SNS were missing resource policies. I added `aws_lambda_permission` for the rule to invoke the Lambda function and an SNS topic policy allowing EventBridge to publish to the topic.
- The best-practices and conclusion text still referred only to Spot Fleet or only to `capacity-optimized`. I updated those references to match the corrected EC2 Fleet example and current allocation strategy guidance.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The corrected examples were reviewed against the current official Terraform AWS provider and AWS documentation. The examples still assume supporting resources such as AMIs, subnets, IAM roles, Lambda handler code, and EKS cluster resources already exist.
