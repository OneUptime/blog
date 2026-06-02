# Validation Summary: How to Use Spot Fleet for Diversified Spot Instance Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 Spot Fleet
- AWS EC2 Spot Instances
- AWS CLI
- EC2 Launch Templates
- Terraform AWS provider
- Amazon EC2 Auto Scaling mixed instance groups

## Sources Consulted
- AWS EC2 User Guide: Best practices for Amazon EC2 Spot - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 User Guide: Which is the best fleet method to use? - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/which-fleet-method-to-use.html
- AWS EC2 User Guide: Example CLI configurations Spot Fleet - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet-examples.html
- AWS CLI Command Reference: request-spot-fleet - https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html
- AWS CLI Command Reference: modify-spot-fleet-request - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-spot-fleet-request.html
- AWS CLI Command Reference: describe-spot-fleet-request-history - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-spot-fleet-request-history.html
- AWS CLI Command Reference: cancel-spot-fleet-requests - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/cancel-spot-fleet-requests.html
- Boto3 EC2 RequestSpotFleet API reference - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/request_spot_fleet.html
- Terraform Registry: aws_spot_fleet_request - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_fleet_request

## Issues Found
- The post presented Spot Fleet as a good choice for most batch or stateless worker workloads. AWS now describes Spot Fleet as a legacy API with no planned investment and recommends EC2 Auto Scaling or EC2 Fleet for new deployments, so the guidance was updated.
- The examples set a fixed maximum Spot price with `SpotPrice` and Terraform `spot_price`. AWS warns that specifying a maximum price can increase interruptions, so those optional price caps were removed.
- The allocation strategy guidance treated `capacityOptimized` as the general AWS recommendation. Current AWS Spot best practices recommend price and capacity optimized allocation when available, so the recommendation was updated.
- The explanation of capacity pools said each launch template override creates a separate pool. AWS defines a Spot capacity pool as an instance type and Availability Zone combination, so the wording was corrected.
- The fleet history command emitted a UTC timestamp without a trailing `Z`. The example was updated to produce an ISO-8601 UTC timestamp with `Z`.
- The opening and summary implied that Spot Fleet always replaces instances automatically. This is only true for `maintain` fleets, so the wording was narrowed.

## Review Notes
The commands and configuration fields are valid for current AWS CLI and Terraform AWS provider documentation, but Spot Fleet itself is legacy. Future new-work tutorials should prefer EC2 Auto Scaling mixed instances or EC2 Fleet unless the article is explicitly about maintaining existing Spot Fleet deployments.
