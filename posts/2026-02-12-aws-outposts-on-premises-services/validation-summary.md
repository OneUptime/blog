# Validation Summary: How to Set Up AWS Outposts for On-Premises AWS Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Outposts racks and servers
- Amazon EC2 and Amazon EBS on Outposts
- Amazon VPC, Outpost subnets, service link, and local gateway
- Amazon ECS and Amazon EKS on Outposts
- Amazon RDS on AWS Outposts
- Amazon S3 on Outposts
- AWS CLI
- Amazon CloudWatch

## Sources Consulted
- AWS Outposts User Guide: https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html
- AWS Outposts rack site requirements: https://docs.aws.amazon.com/outposts/latest/userguide/outposts-requirements.html
- AWS Outposts service link documentation: https://docs.aws.amazon.com/outposts/latest/userguide/service-links.html
- AWS Outposts local gateway documentation: https://docs.aws.amazon.com/outposts/latest/userguide/outposts-local-gateways.html
- AWS CLI `outposts list-catalog-items`: https://docs.aws.amazon.com/cli/latest/reference/outposts/list-catalog-items.html
- AWS CLI `outposts create-outpost`: https://docs.aws.amazon.com/cli/latest/reference/outposts/create-outpost.html
- AWS CLI `outposts create-order`: https://docs.aws.amazon.com/cli/latest/reference/outposts/create-order.html
- AWS CLI `ec2 describe-instance-type-offerings`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-type-offerings.html
- Amazon ECS on AWS Outposts: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using-outposts.html
- Amazon RDS on AWS Outposts creation guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-on-outposts.creating.html
- Amazon RDS on AWS Outposts instance classes: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-on-outposts.db-instance-classes.html
- AWS CLI `s3control create-bucket`: https://docs.aws.amazon.com/cli/latest/reference/s3control/create-bucket.html
- AWS CLI `s3control create-access-point`: https://docs.aws.amazon.com/cli/latest/reference/s3control/create-access-point.html
- AWS Outposts rack pricing: https://aws.amazon.com/outposts/rack/pricing/
- Amazon RDS on AWS Outposts pricing: https://aws.amazon.com/rds/outposts/pricing/
- AWS Outposts high availability failure modes whitepaper: https://docs.aws.amazon.com/whitepapers/latest/aws-outposts-high-availability-design/thinking-in-terms-of-failure-modes.html

## Issues Found
- The post described Outposts as a rack or partial rack and said Outposts Rack could be a partial rack. AWS documents Outposts racks as 42U racks, so the wording was corrected to avoid implying a partial physical rack form factor.
- The site requirement checklist used `5-15 kW` and a `minimum 1 Gbps connection` for the service link. AWS documents 5, 10, or 15 kVA power configurations, supported uplinks of 1/10/40/100 Gbps, and service link bandwidth guidance of redundant connectivity of at least 500 Mbps per compute rack. The checklist was updated.
- The ordering example labeled `aws outposts create-outpost` as creating an Outpost order. That command creates the Outpost resource; ordering is handled by `aws outposts create-order`. The example now shows both steps.
- Several placeholder ARNs and IDs used invalid 9-digit account IDs or shortened Outpost IDs. These were changed to valid 12-digit account ID placeholders and valid-form Outpost ID placeholders where used in ARNs and Outposts commands.
- The EC2 instance type availability example filtered `describe-instance-type-offerings` with only the Outpost ID. AWS CLI documentation requires the Outpost ARN for `--location-type outpost`, so the filter value was changed to an Outpost ARN.
- The ECS example used the `FARGATE` capacity provider. AWS documents that Fargate is not available on AWS Outposts, so the example now creates a cluster without Fargate and notes that tasks run on EC2 instances in the Outpost subnet.
- The RDS example omitted Outposts-specific settings shown in AWS guidance, including the Outpost Availability Zone, VPC security group, backup target, encryption, and safer password handling. The command was updated to align with the RDS on Outposts CLI example.
- The S3 on Outposts access point example omitted the required `--account-id` parameter and used an invalid bucket ARN placeholder. The command now includes `--account-id` and a valid-form S3 on Outposts bucket ARN.
- The pricing section implied that all services running on Outposts avoid separate charges. AWS pricing documentation shows managed services such as RDS on Outposts can have service-specific management charges. The cost model was updated to distinguish rack capacity from managed-service charges and related billable resources.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the current official AWS CLI command reference and AWS service documentation instead of local `--help` output.
