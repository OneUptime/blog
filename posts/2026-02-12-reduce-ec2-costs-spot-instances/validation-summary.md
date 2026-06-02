# Validation Summary: How to Reduce EC2 Costs with Spot Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 Spot Instances
- AWS CLI
- Terraform AWS Provider
- EC2 Spot Fleet
- EC2 Auto Scaling mixed instances groups
- EC2 Instance Metadata Service v2
- Amazon EventBridge
- AWS Lambda
- Elastic Load Balancing
- Amazon EKS
- Amazon ECS
- Python with boto3 and requests

## Sources Consulted
- AWS EC2 Spot Instances overview: https://aws.amazon.com/ec2/spot/
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 Spot Instance Advisor: https://aws.amazon.com/ec2/spot/instance-advisor/
- AWS EC2 Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Fleet and Spot Fleet allocation strategies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html
- AWS CLI run-instances reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Terraform AWS Provider aws_spot_fleet_request documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/spot_fleet_request.html.markdown
- Terraform AWS Provider aws_autoscaling_group documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- Amazon ECS Spot Instance draining documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/spot-instance-draining-linux-container.html
- Amazon ECS Fargate Spot documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS Node Termination Handler repository: https://github.com/aws/aws-node-termination-handler

## Issues Found
- The post generalized that larger, older instance types tend to have higher interruption rates. AWS documents interruption frequency as pool-dependent and recommends checking Spot Instance Advisor, so the wording was changed to reference instance type, Region, Availability Zone, and point-in-time capacity.
- The production guidance presented Spot Fleet without noting that AWS and the Terraform AWS Provider now discourage the legacy Spot Fleet APIs for new designs. The text now mentions EC2 Fleet and Auto Scaling groups as recommended alternatives while preserving the Spot Fleet example.
- The metadata polling script used IMDSv1-style requests. It was updated to request and pass an IMDSv2 token for both the interruption notice and instance ID metadata calls.
- The ECS container note conflated ECS interruption handling modes. It now distinguishes AWS Node Termination Handler for EKS, Spot Instance draining for EC2-backed ECS, and SIGTERM handling for Fargate Spot tasks.
- The EventBridge Terraform snippet added a Lambda target but omitted the `aws_lambda_permission` resource required for EventBridge to invoke the function. The missing permission was added.

## Review Notes
- The AWS CLI command and Terraform ASG mixed instances policy fields match current AWS and Terraform provider documentation.
- The Spot Fleet example remains technically valid, but EC2 Fleet or Auto Scaling groups are better defaults for new production designs.
- AWS CLI was not installed in the local environment, so CLI validation was performed against official AWS CLI documentation rather than local `aws --help` output.
