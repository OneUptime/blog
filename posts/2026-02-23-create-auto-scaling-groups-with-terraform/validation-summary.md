# Validation Summary: How to Create Auto Scaling Groups with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon EC2 Auto Scaling Groups
- AWS Launch Templates
- Elastic Load Balancing target groups
- EC2 Auto Scaling instance refresh
- EC2 Auto Scaling mixed instances policies
- EC2 Auto Scaling warm pools
- EC2 Auto Scaling lifecycle hooks

## Sources Consulted
- Terraform AWS provider documentation: `aws_autoscaling_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider documentation: `aws_launch_template` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider documentation: `aws_lb_target_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider documentation: `aws_autoscaling_lifecycle_hook` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_lifecycle_hook
- AWS documentation: About health checks for your Auto Scaling group - https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html
- AWS documentation: How an instance refresh works in an Auto Scaling group - https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html
- AWS documentation: Configure termination policies for Amazon EC2 Auto Scaling - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html
- AWS documentation: Allocation strategies for multiple instance types - https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- AWS documentation: Decrease latency for applications with long boot times using warm pools - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html
- AWS documentation: Amazon EC2 Auto Scaling lifecycle hooks - https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html

## Issues Found
- The Auto Scaling Group examples used `version = "$Latest"` for launch templates. This is accepted by AWS, but Terraform's AWS provider documentation notes that instance refresh will not start on launch template changes when `"$Latest"` is configured; it recommends `aws_launch_template.app.latest_version` so Terraform can detect the changed launch template version. Updated the examples to use `aws_launch_template.app.latest_version`.
- The termination policy comment described `AllocationStrategy` as terminating Spot instances before On-Demand instances. AWS documents this policy as choosing instances to better align the remaining capacity with the group's allocation strategy for the purchase option being terminated, not as a blanket Spot-before-On-Demand rule. Updated the comment to reflect the documented behavior.
- The warm pool comment said stopped instances are free. AWS warm pool documentation states that stopped or hibernated instances avoid EC2 compute charges, but associated EBS volumes and Elastic IP addresses can still incur charges. Updated the comment to say there is no EC2 compute charge, but storage still costs.

## Review Notes
The snippets are illustrative and assume supporting resources such as the AMI data source, security group, IAM instance profile, load balancer listener, SNS topic, and lifecycle hook IAM role exist elsewhere in the Terraform configuration. The core resource arguments and ASG behavior described in the post are current and technically valid after the corrections above.
