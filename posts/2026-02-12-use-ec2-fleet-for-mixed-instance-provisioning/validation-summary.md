# Validation Summary: How to Use EC2 Fleet for Mixed Instance Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 Fleet
- Amazon EC2 Spot Instances
- AWS CLI
- Terraform AWS Provider
- EC2 launch templates
- Amazon CloudWatch

## Sources Consulted
- AWS CLI Command Reference: `create-fleet` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-fleet.html
- AWS CLI Command Reference: `describe-fleets` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-fleets.html
- AWS CLI Command Reference: `describe-fleet-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-fleet-instances.html
- Amazon EC2 User Guide: EC2 Fleet and Spot Fleet request types - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-request-type.html
- Amazon EC2 User Guide: Use allocation strategies to determine how EC2 Fleet or Spot Fleet fulfills Spot and On-Demand capacity - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html
- Amazon EC2 User Guide: Spot Instance interruption notices - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- Terraform Registry: `aws_ec2_fleet` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_fleet

## Issues Found
- The AWS CLI prioritized On-Demand example used priorities starting at 1 and the text did not explain that lower numbers have higher priority. Updated the example to use priorities starting at 0 and added the priority-ordering caveat.
- The post said the `Priority` field only matters for On-Demand. That is too broad because Spot can also use priorities with `capacity-optimized-prioritized`. Reworded the sentence to apply specifically to the shown `price-capacity-optimized` example.
- The Terraform example used `on_demand_options { allocation_strategy = "prioritized" }` but did not assign override priorities, so the prioritized strategy would not meaningfully order the overrides. Added `priority` values to the override blocks.
- The `describe-fleet-instances` query included `AvailabilityZone`, but the AWS CLI output for `ActiveInstances` includes instance ID, instance type, Spot request ID, and instance health, not Availability Zone. Removed the AZ projection from the query.

## Review Notes
- The AWS CLI and Terraform executables were not installed in the local environment, so command and schema validation was performed against official AWS CLI, Amazon EC2, and Terraform Registry documentation.
- The examples use placeholder launch template IDs, AMI IDs, key names, fleet IDs, and security group resources. Those are appropriate for tutorial snippets but must be replaced with real environment-specific values before use.
