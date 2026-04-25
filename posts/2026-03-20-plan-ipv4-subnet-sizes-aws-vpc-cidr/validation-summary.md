# Validation Summary: How to Plan IPv4 Subnet Sizes for AWS VPC Using CIDR Notation

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS VPC
- Amazon EKS
- Amazon RDS
- IPv4
- CIDR notation
- Python `ipaddress`

## Sources Consulted
- Amazon VPC subnet sizing: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- Amazon EC2 `CreateSubnet` API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateSubnet.html
- Amazon VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Amazon RDS working with a DB instance in a VPC: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- Amazon EKS networking best practices: https://docs.aws.amazon.com/eks/latest/best-practices/networking.html
- Amazon EKS custom networking: https://docs.aws.amazon.com/eks/latest/best-practices/custom-networking.html
- Python `ipaddress` library: https://docs.python.org/3/library/ipaddress.html
- RFC 6598 shared address space: https://datatracker.ietf.org/doc/html/rfc6598

## Issues Found
- The EKS sizing section implied that a separate Pod CIDR is a default requirement. I corrected it to state that Amazon VPC CNI uses the node subnet by default, and that a separate range such as `100.64.0.0/10` applies when using EKS custom networking with a secondary VPC CIDR.
- The reserved `10.0.100.0/22` block was labeled as a Kubernetes pod subnet, which was too specific for the default EKS networking model. I renamed it to an EKS expansion subnet.
- The conclusion said `/28` subnets are suitable for RDS subnet groups. Amazon RDS documentation says DB subnets must leave spare IP capacity for maintenance, failover, and scaling, and gives `/24` as a typical example. I replaced that guidance with a narrower statement that `/28` is only for very small-purpose subnets and that RDS subnet groups usually need larger subnets.

## Review Notes
- The Python overlap-check script is syntactically valid and was executed locally against the example subnet list. It printed `No overlaps found - plan is valid`.
- The AWS reserved-address explanation and the usable-address counts in the subnet size table are technically correct for standard AWS VPC IPv4 subnets.
