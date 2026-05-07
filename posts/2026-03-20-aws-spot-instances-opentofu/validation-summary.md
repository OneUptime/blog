# Validation Summary: How to Use AWS Spot Instances with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2 Spot Instances
- Amazon EC2 Auto Scaling
- Amazon EKS managed node groups
- HCL with the AWS provider

## Sources Consulted
- HashiCorp AWS provider docs for `aws_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider docs for `aws_spot_instance_request`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/spot_instance_request.html.markdown
- HashiCorp AWS provider docs for `aws_launch_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- HashiCorp AWS provider docs for `aws_autoscaling_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- HashiCorp AWS provider docs for `aws_eks_node_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_node_group.html.markdown
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS Auto Scaling launch template advanced settings: https://docs.aws.amazon.com/autoscaling/ec2/userguide/advanced-settings-for-your-launch-template.html
- AWS EKS managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- AWS EKS CreateNodegroup API: https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateNodegroup.html
- AWS EKS instance type guidance: https://docs.aws.amazon.com/eks/latest/userguide/choosing-instance-type.html

## Issues Found
- The original Spot example used `aws_spot_instance_request`, which the AWS provider documents as a legacy API path and recommends replacing with `aws_instance` plus `instance_market_options`. I updated the example to use the current pattern.
- The original Spot example base64-encoded `user_data` even though `aws_spot_instance_request` inherits `aws_instance` user data semantics, where `user_data` should be plain text and `user_data_base64` is the base64 field. The revised example now uses plain `user_data`.
- The interruption polling loop used `spot/termination-time`, which only cleanly covers termination notices. AWS documents `spot/instance-action` for interruption handling across `terminate`, `stop`, and `hibernate`, so I updated the metadata path accordingly.
- The interruption handler called `shutdown -h now`, but the instance did not set `instance_initiated_shutdown_behavior`. The provider documents that EBS-backed instances default this to `stop`, so I added `instance_initiated_shutdown_behavior = "terminate"` so the shutdown path matches the intended Spot behavior.
- The Auto Scaling launch template requested Spot capacity via `instance_market_options`, but AWS documents that a launch template configured to request Spot Instances cannot be used with a mixed instances policy. I removed the Spot market block from the launch template and left Spot selection to the Auto Scaling group’s `mixed_instances_policy`.
- The Auto Scaling example referenced `aws_launch_template.app.id`, but the defined resource name was `aws_launch_template.mixed`. I corrected the reference.
- The Auto Scaling and EKS examples mixed Arm instance types (`r7g`, `r6g`, `m7g`) with `r7a`, which is x86_64, without separate AMIs or launch templates. I replaced the x86_64 entry with an Arm-compatible type and added an explicit Arm EKS `ami_type` so the EKS example is architecture-consistent.
- The EKS example used `node.kubernetes.io/capacity-type` as a user-managed label. AWS documents that managed node groups automatically add `eks.amazonaws.com/capacityType: SPOT`, so I replaced the manual label with a custom workload label instead of showing a misleading reserved-style key.

## Review Notes
- For EKS Spot managed node groups, AWS recommends multiple instance types and, when using Cluster Autoscaler, instance types with similar vCPU and memory shapes. The corrected example is valid, but production configurations may benefit from tighter shape alignment.
- The post now uses current provider-supported AWS APIs and current EKS AMI type naming, but readers should still ensure their AMI selection matches the CPU architecture of any EC2 instance types they choose.
