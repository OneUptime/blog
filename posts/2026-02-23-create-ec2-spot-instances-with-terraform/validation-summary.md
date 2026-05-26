# Validation Summary: How to Create EC2 Spot Instances with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS EC2 Spot Instances
- AWS Auto Scaling Groups
- AWS Launch Templates
- AWS Spot Fleet / EC2 Fleet concepts
- AWS CLI
- EC2 Instance Metadata Service v2
- Elastic Load Balancing target deregistration

## Sources Consulted
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Spot request tags: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts-spot-instances-request-tags.html
- AWS CLI `describe-spot-price-history`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-spot-price-history.html
- Terraform AWS Provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_spot_instance_request`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_instance_request
- Terraform AWS Provider `aws_spot_fleet_request`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_fleet_request
- Terraform AWS Provider `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- OneUptime linked Auto Scaling article: https://oneuptime.com/blog/post/2026-02-23-create-auto-scaling-groups-with-terraform/view

## Issues Found
- The post overstated omitted Spot max-price behavior by saying the instance would always launch as long as capacity is available. Updated the wording to clarify that AWS caps at On-Demand pricing by default, but requests can still wait or fail when the selected capacity is unavailable.
- The `aws_spot_instance_request` section presented RequestSpotInstances as a normal control option. Added a caveat that AWS strongly discourages this legacy API for new designs and recommends newer approaches where possible.
- The `aws_spot_fleet_request` section presented Spot Fleet without noting its legacy status. Added a caveat that RequestSpotFleet is legacy and that EC2 Fleet or Auto Scaling Groups should be preferred for new production designs.
- Updated Spot Fleet allocation from `capacityOptimized` to `priceCapacityOptimized`, and Auto Scaling Group Spot allocation from `capacity-optimized` to `price-capacity-optimized`, matching current AWS Spot best-practice guidance while using the correct Terraform provider enum spelling for each resource.
- The interruption handling script used IMDSv1 metadata requests. Updated it to fetch and pass an IMDSv2 token for the Spot `instance-action` endpoint and instance ID lookup.
- The summary recommended only 4-6 instance types. Updated it to AWS's current recommendation to be flexible across at least 10 instance types for each workload.
- The summary recommended Spot Fleets for batch workloads. Updated it to recommend EC2 Fleet or Auto Scaling Groups for multiple-instance diversity.

## Review Notes
- The Terraform snippets still assume surrounding resources and data sources exist, such as VPC subnets, security groups, IAM profiles, and AMI data sources. That is reasonable for a focused blog post, but readers need those prerequisites in a real module.
- `aws_spot_instance_request` request-level `tags` are not automatically applied to launched instances according to Terraform and AWS docs. The snippet is still syntactically valid, but future revisions could clarify tag behavior if instance tagging is important.
