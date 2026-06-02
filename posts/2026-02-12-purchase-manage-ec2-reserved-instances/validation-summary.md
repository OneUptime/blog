# Validation Summary: How to Purchase and Manage EC2 Reserved Instances

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EC2 Reserved Instances
- AWS CLI for EC2
- AWS Cost Explorer CLI
- Reserved Instance Marketplace
- EC2 cost optimization

## Sources Consulted
- Amazon EC2 User Guide: Reserved Instances overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html
- Amazon EC2 User Guide: Regional and zonal Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html
- Amazon EC2 User Guide: Types of Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-types.html
- Amazon EC2 User Guide: Modify Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-modifying.html
- Amazon EC2 User Guide: Exchange Convertible Reserved Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-convertible-exchange.html
- Amazon EC2 User Guide: Sell Reserved Instances in the Marketplace: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-market-general.html
- AWS CLI Command Reference: describe-reserved-instances-offerings: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-reserved-instances-offerings.html
- AWS CLI Command Reference: purchase-reserved-instances-offering: https://docs.aws.amazon.com/cli/latest/reference/ec2/purchase-reserved-instances-offering.html
- AWS CLI Command Reference: modify-reserved-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-reserved-instances.html
- AWS CLI Command Reference: accept-reserved-instances-exchange-quote: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-reserved-instances-exchange-quote.html
- AWS CLI Command Reference: create-reserved-instances-listing: https://docs.aws.amazon.com/cli/v1/reference/ec2/create-reserved-instances-listing.html
- AWS CLI Command Reference: get-reservation-purchase-recommendation: https://docs.aws.amazon.com/cli/v1/reference/ce/get-reservation-purchase-recommendation.html
- AWS CLI Command Reference: get-reservation-utilization: https://docs.aws.amazon.com/cli/latest/reference/ce/get-reservation-utilization.html

## Issues Found
- Regional Reserved Instances were described as providing a region-wide capacity reservation benefit. AWS documentation states that regional RIs do not reserve capacity; only zonal RIs reserve capacity in a specified Availability Zone. Updated the regional scope description.
- The `modify-reserved-instances` example passed `--target-configurations` as a single JSON object. AWS CLI expects a list of target configuration objects. Updated the snippet to use a JSON array and included `Scope` for the zonal target.
- The instance size flexibility example used incorrect normalization units for `m5.large`, `m5.medium`, and `m5.xlarge`. Updated the values to 4, 2, and 8 units respectively, and clarified that size flexibility applies to regional Linux/UNIX RIs with default tenancy.
- The Convertible RI exchange command used `ReservedInstancesOfferingId` inside `--target-configurations`. AWS CLI expects `OfferingId`. Updated the command.
- The Cost Explorer RI utilization command grouped by `INSTANCE_TYPE`, but AWS CLI documentation says `get-reservation-utilization` grouping supports only `SUBSCRIPTION_ID`. Removed the unsupported group-by argument.
- The pricing table was labeled as a real example. Because EC2 and RI prices can change over time, changed this to an illustrative example.

## Review Notes
The AWS CLI is not installed in the local environment, so command validation was performed against official AWS CLI command reference documentation rather than local `aws --help` output.
