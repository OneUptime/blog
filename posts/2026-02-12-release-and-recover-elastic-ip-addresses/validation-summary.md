# Validation Summary: How to Release and Recover Elastic IP Addresses

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Elastic IP addresses
- Amazon EC2 and VPC
- AWS CLI
- AWS Cost Explorer
- Python boto3
- Terraform AWS provider

## Sources Consulted
- AWS EC2 User Guide: Elastic IP addresses - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS EC2 User Guide: Release an Elastic IP address - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing-eips-releasing.html
- AWS EC2 User Guide: Transfer an Elastic IP address between AWS accounts - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/transfer-EIPs-intro-ec2.html
- AWS CLI Command Reference: allocate-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: describe-addresses - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-addresses.html
- AWS CLI Command Reference: disassociate-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/disassociate-address.html
- AWS CLI Command Reference: release-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/release-address.html
- Boto3 EC2 client describe_addresses documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_addresses.html
- AWS VPC User Guide: billing and usage report codes - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-billing-usage-reports.html
- AWS VPC Pricing: Public IPv4 address pricing - https://aws.amazon.com/vpc/pricing/
- Terraform lifecycle meta-argument reference - https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform AWS provider aws_eip resource documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip

## Issues Found
- The opening and unused-EIP wording implied only idle Elastic IP addresses are charged. Updated it to reflect current AWS public IPv4 pricing, where Elastic IP addresses are charged whether in use or idle.
- The cross-region unused-EIP script used an `association-id` filter with an empty value. AWS documents `association-id` as a filter for matching an association ID, not for finding absent association IDs. Changed the script to count `Addresses[?AssociationId==null]` with JMESPath.
- The release explanation said any associated EIP release would error. AWS CLI docs distinguish default VPC behavior from nondefault VPC behavior, so the statement now specifies nondefault VPCs.
- The text called the unassociated-EIP release script a force-release script that disassociates and releases, but it only releases already unassociated EIPs. Updated the description to match the script.
- The Terraform `prevent_destroy` explanation said it still protects the EIP if the resource is removed from configuration. Terraform's lifecycle documentation says `prevent_destroy` must be present in configuration and does not protect a resource after its configuration block is removed. Updated the explanation.
- The EIP transfer section omitted that the destination account cannot accept a transfer while the EIP is associated with an ENI or EC2 instance. Added that caveat while keeping the original workflow.
- The Cost Explorer example used the obsolete or incorrect usage type `ElasticIP:IdleAddress`. Updated it to the current VPC billing-code form `USE1-PublicIPv4:IdleAddress` and added a note to replace the regional billing prefix or group by usage type.

## Review Notes
The examples are intentionally illustrative and use placeholder IDs, IP addresses, topic ARNs, and billing dates. The Lambda example scans only the Lambda function's configured region; multi-region cleanup would need an explicit region loop similar to the CLI example.
