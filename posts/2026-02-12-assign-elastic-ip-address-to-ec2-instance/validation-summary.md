# Validation Summary: How to Assign an Elastic IP Address to an EC2 Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Elastic Compute Cloud (EC2)
- Elastic IP addresses
- Elastic Network Interfaces (ENIs)
- AWS CLI
- Amazon VPC public IPv4 pricing
- DNS A records

## Sources Consulted
- AWS EC2 User Guide: Elastic IP addresses, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS EC2 User Guide: Associate an Elastic IP address with an instance, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-eips.html
- AWS EC2 User Guide: Amazon EC2 instance IP addressing, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- AWS EC2 User Guide: How EC2 instance stop and start works, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-stop-start-works.html
- AWS EC2 User Guide: Elastic network interfaces, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html
- AWS EC2 User Guide: Network interface attachments, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network-interface-attachments.html
- AWS General Reference: Amazon EC2 endpoints and quotas, https://docs.aws.amazon.com/general/latest/gr/ec2-service.html
- AWS CLI Command Reference: allocate-address, https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: associate-address, https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS CLI Command Reference: disassociate-address, https://docs.aws.amazon.com/cli/latest/reference/ec2/disassociate-address.html
- AWS CLI Command Reference: release-address, https://docs.aws.amazon.com/cli/latest/reference/ec2/release-address.html
- AWS CLI Command Reference: describe-instance-status, https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-status.html
- Amazon VPC Pricing: Public IPv4 Address, https://aws.amazon.com/vpc/pricing/

## Issues Found
- The cost section said idle Elastic IPs incur an additional charge on top of the base public IPv4 rate. Updated it to reflect current AWS pricing: idle and in-use public IPv4 addresses are charged the same $0.005 hourly rate.
- The reassociation guidance implied `--allow-reassociation` is required to move an Elastic IP that is already attached elsewhere. Updated the text to clarify that reassociation is automatic by default and `--no-allow-reassociation` is the option that prevents remapping.
- The release guidance said you cannot get the same IP back after releasing it. Updated it to match AWS CLI documentation: recovery may be possible if the address has not been allocated to another AWS account, but users should not rely on it.
- The ENI failover guidance omitted AWS constraints. Updated it to clarify that this applies to secondary network interfaces and that the destination instance must be in the same Availability Zone.

## Review Notes
The AWS CLI commands and options used in the post are valid for current AWS CLI v2 documentation. The pricing section is accurate as of this validation date, but public IPv4 pricing should be rechecked periodically because AWS pricing can change.
