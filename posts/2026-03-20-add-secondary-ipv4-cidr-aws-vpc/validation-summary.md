# Validation Summary: How to Add a Secondary IPv4 CIDR Block to an Existing AWS VPC

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon VPC
- AWS CLI
- IPv4 CIDR block management
- Amazon EKS
- Amazon VPC CNI custom networking

## Sources Consulted
- Amazon VPC User Guide: Add or remove a CIDR block from your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/add-ipv4-cidr.html
- Amazon VPC User Guide: VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Amazon VPC User Guide: Amazon VPC quotas: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS CLI Command Reference: `associate-vpc-cidr-block`: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-vpc-cidr-block.html
- AWS CLI Command Reference: `describe-vpcs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS CLI Command Reference: `create-subnet`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- AWS CLI Command Reference: `disassociate-vpc-cidr-block`: https://docs.aws.amazon.com/cli/latest/reference/ec2/disassociate-vpc-cidr-block.html
- Amazon EKS Best Practices Guide: Custom Networking: https://docs.aws.amazon.com/eks/latest/best-practices/custom-networking.html

## Issues Found
- The post mixed `100.64.0.0/20` and `100.64.0.0/16` as if they were interchangeable examples on the same VPC. I standardized the examples on `100.64.0.0/16` so the sequence no longer implies an overlapping secondary CIDR association that AWS would reject.
- The introduction and rules section described the IPv4 CIDR count as a hard maximum of five total blocks. I corrected this to the documented default quota of five IPv4 CIDR blocks per VPC and noted that the quota is adjustable.
- The verification command only listed CIDR blocks and did not actually confirm that the new block had reached the `associated` state. I changed the `describe-vpcs` query and expected output to include the association state.
- The EKS section implied that adding a secondary CIDR alone is sufficient for Pods to use it. I clarified that this usage depends on Amazon VPC CNI custom networking, which is the documented mechanism for assigning Pod IPs from secondary VPC CIDRs.
- The disassociation note said the operation fails only when subnets still exist in the range. I corrected this to match AWS documentation, which requires deleting or detaching all dependent resources associated with that CIDR block before disassociation.

## Review Notes
- The examples use `us-east-1a`, so readers must substitute an Availability Zone that exists in the same Region as their VPC.
- AWS documents `100.64.0.0/10` and `198.19.0.0/16` as candidate ranges for EKS custom networking; keeping `100.64.0.0/10` in the post is technically sound.
