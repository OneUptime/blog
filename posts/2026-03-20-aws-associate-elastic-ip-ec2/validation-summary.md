# Validation Summary: How to Associate an Elastic IP with an EC2 Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Elastic IP addresses (EIP)
- AWS CLI
- Terraform AWS Provider
- IPv4 networking

## Sources Consulted
- Amazon EC2 User Guide: Associate an Elastic IP address with an instance — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-eips.html
- Amazon EC2 User Guide: Elastic IP addresses — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- Amazon EC2 User Guide: Amazon EC2 instance IP addressing — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- AWS CLI Command Reference: `allocate-address` — https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: `associate-address` — https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS CLI Command Reference: `describe-addresses` — https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-addresses.html
- Amazon EC2 service quotas — https://docs.aws.amazon.com/general/latest/gr/ec2-service.html
- Amazon VPC pricing — https://aws.amazon.com/vpc/pricing/
- Terraform Registry: `aws_eip_association` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip_association

## Issues Found
- The cost section stated that AWS only charges for EIPs that are allocated and not associated with a running instance. AWS now charges for all public IPv4 addresses, including Elastic IPs that are in use and idle. I corrected the explanation to match current AWS pricing guidance.
- The release example implied that you must always disassociate an EIP before releasing it. That is only necessary when the EIP is currently associated, so I clarified the comment to reflect the actual workflow.
- The verification example labeled the `AssociationId` field as `State` in the JMESPath query output. I renamed the output field so it matches the EC2 API attribute being returned.
- The conclusion claimed that Elastic IPs help with "SSL certificate validation." That is misleading because certificate validation is not generally dependent on a fixed public IP, so I replaced it with a stable-public-IP use case that is technically accurate.

## Review Notes
- `aws ec2 associate-address --instance-id` works when the target instance has exactly one attached network interface. The post is still correct because it also provides the `--network-interface-id` alternative for more complex networking setups.
- In VPC, reassociation can happen automatically when you run `associate-address`; the explicit disassociate-then-associate flow shown in the post remains a safe and valid operational sequence.
- The Terraform example is consistent with the current AWS provider documentation for managing a standalone Elastic IP association.
