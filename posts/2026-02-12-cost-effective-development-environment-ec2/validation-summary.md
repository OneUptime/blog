# Validation Summary: How to Set Up a Cost-Effective Development Environment on EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- EC2 Spot Instances
- T3 and T4g burstable instances
- AWS Graviton
- Amazon EBS gp3 volumes
- AWS Systems Manager Session Manager
- Amazon CloudWatch metrics
- AWS Lambda with boto3
- AWS Budgets
- AWS cost allocation tags and Cost Explorer
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: `ec2 run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 User Guide: Spot Instance interruption behavior - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/interruption-behavior.html
- Amazon EC2 User Guide: How Spot Instances work - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-spot-instances-work.html
- Amazon EC2 Spot Instances overview and pricing - https://aws.amazon.com/ec2/spot/
- Amazon EC2 T3 instance documentation - https://aws.amazon.com/ec2/instance-types/t3/
- Amazon EC2 T4g instance documentation - https://aws.amazon.com/ec2/instance-types/t4/
- Amazon EBS User Guide: General Purpose SSD gp3 volumes - https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- AWS Systems Manager User Guide: Starting Session Manager sessions and port forwarding - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS CLI Command Reference: `budgets create-budget` - https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS Billing User Guide: Cost allocation tags - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- Amazon EC2 On-Demand Pricing - https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- The CloudWatch CPU credit command used BSD/macOS `date -v-1d`, which fails on a typical Linux shell. Changed it to GNU/Linux `date -d '1 day ago'`, which is more appropriate for an EC2-focused development environment.
- The T3 CPU credit guidance suggested switching to T3 Unlimited when credits hit zero. T3 instances are launched in Unlimited mode by default for On-Demand, so the guidance was changed to confirm Unlimited mode, watch for surplus credit charges, or move to a fixed-performance instance.
- The cost monitoring section described plain resource tags as "Cost Explorer tags." AWS requires user-defined tags to be activated as cost allocation tags before they appear in Cost Explorer or cost allocation reports. Updated the wording and added the activation step.
- The savings summary listed the m5.xlarge to t3.medium right-sizing savings as 75% and compared against a $122/month m5.xlarge. Current Linux On-Demand pricing in us-east-1 makes m5.xlarge roughly $138/month using the post's 720-hour monthly convention, so the savings was updated to 79% and the final comparison text was corrected.

## Review Notes
- AWS CLI is not installed in this workspace, so command validation was performed against the official AWS CLI reference rather than local `aws --help` output.
- EC2 prices vary by Region, operating system, and time. The post's figures are reasonable as approximate Linux On-Demand examples, but future reviews should re-check the pricing table against the current AWS pricing page.
