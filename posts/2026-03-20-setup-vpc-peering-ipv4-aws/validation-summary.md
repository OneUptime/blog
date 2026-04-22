# Validation Summary: How to Set Up VPC Peering for IPv4 on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- VPC peering
- IPv4 CIDR routing
- AWS CLI
- Amazon EC2 security groups
- Amazon VPC DNS options

## Sources Consulted
- Amazon VPC Peering overview: https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- AWS VPC peering workflow and limitations: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- AWS VPC peering route table documentation: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html
- AWS VPC peering DNS resolution documentation: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- AWS CLI `create-vpc` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html
- AWS CLI `create-vpc-peering-connection` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CLI `accept-vpc-peering-connection` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-vpc-peering-connection.html
- AWS CLI `create-route` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI `authorize-security-group-ingress` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon EC2 security group rules for ping/ICMP: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html

## Issues Found
1. **Peering request command scope was ambiguous.** The post correctly mentioned that VPC peering can work across accounts and Regions, but the shown `create-vpc-peering-connection` command only covered the simple same-account, same-Region form. Added a sentence explaining that cross-account and cross-Region peering require `--peer-owner-id`, `--peer-region`, or both as needed.
2. **Acceptance wording was too narrow.** The post said to accept only if both VPCs are in the same account. AWS requires the owner of the accepter VPC to accept the peering request; same-account peering simply lets the same credentials perform that action. Updated the wording.
3. **Route table guidance was oversimplified.** AWS requires routes in the route tables associated with the subnets whose instances need to communicate, not just a generic VPC-level route table. Updated the route table language while keeping the existing examples.
4. **Security group example did not match the verification step.** The original command allowed TCP 443 from VPC B to VPC A, but the verification used `ping` from VPC A to VPC B. Updated the example to allow ICMP from VPC A's CIDR on the destination security group in VPC B.

## Review Notes
- After the fixes, the AWS CLI commands use valid current options according to the AWS CLI v2 command reference.
- The post uses placeholder IDs such as `vpc-aaaaaaaa`, `rtb-aaaaaaaa`, and `pcx-xxxxxxxxxxxxxxxxx`; readers must replace these with real resource IDs.
- A complete end-to-end test also requires instances, subnets, route table associations, permissive network ACLs, and host firewalls that allow the tested traffic. The post focuses on the VPC peering-specific steps.
- The DNS limitation is accurate: resolving public EC2 DNS hostnames to private IPv4 addresses across a peering connection requires VPC DNS attributes and peering DNS resolution options.
