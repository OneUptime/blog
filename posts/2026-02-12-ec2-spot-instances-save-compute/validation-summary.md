# Validation Summary: How to Use EC2 Spot Instances to Save Up to 90% on Compute

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon EC2 Spot Instances
- AWS CLI
- EC2 Launch Templates
- EC2 Auto Scaling mixed instances policies
- Terraform AWS provider
- EC2 Instance Metadata Service
- Amazon EventBridge
- AWS Cost Explorer and CloudWatch

## Sources Consulted
- Amazon EC2 Spot pricing: https://aws.amazon.com/ec2/spot/pricing/
- Amazon EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- Create a Spot Instance request: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-requests.html
- Behavior of Spot Instance interruptions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/interruption-behavior.html
- Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- Amazon EC2 Auto Scaling allocation strategies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- AWS CLI create-launch-template command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- Terraform AWS provider aws_autoscaling_group resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group

## Issues Found
- The introduction said Spot Instances let users "bid" on unused EC2 capacity. AWS no longer uses the traditional Spot bidding model, so this was changed to "request" unused EC2 capacity.
- The pricing section said you pay the current Spot price at launch. AWS states that you pay the Spot price in effect for the time period the instances are running, so the wording was corrected.
- The max price guidance recommended setting `MaxPrice` to the On-Demand price. AWS currently recommends using no maximum price, which caps Spot at the On-Demand price, so the guidance was updated while preserving the example as a capped request.
- The Launch Templates section implied that a launch template alone can specify multiple instance types and pick the cheapest option. Launch templates store instance launch parameters; multiple instance type selection and allocation strategies are handled by services such as Auto Scaling groups, EC2 Fleet, or Spot Fleet. The wording was corrected.
- The Launch Template example was described as supporting both Spot and On-Demand requests, but its `InstanceMarketOptions` sets `MarketType` to `spot`. The description was corrected to say it stores Spot settings for requests that use the template.
- The interruption behavior note omitted the important constraint that stopped persistent Spot Instances restart in the same Availability Zone and for the same instance type. That caveat was added.
- The Terraform Auto Scaling group used `capacity-optimized`; this is valid, but AWS currently recommends `price-capacity-optimized` for Spot allocation. The snippet and related best-practice text were updated.
- The best-practice list recommended at least 6 instance types and still used "bid" terminology. AWS's current rule of thumb is at least 10 instance types for each workload, and the remaining bid wording was updated to price-cap terminology.

## Review Notes
The AWS CLI commands and Terraform block use valid parameter names and structure. The standalone `run-instances` approach is technically valid but AWS documents it as a limited method because it cannot request multiple instance types or mix Spot and On-Demand in one request; the post already positions Auto Scaling as the better approach.
