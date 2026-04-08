# Validation Summary: How to Configure VPC Peering for MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB Atlas (VPC Peering feature)
- AWS VPC and VPC Peering
- AWS CLI (ec2 commands)
- MongoDB Atlas Administration API v1.0
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Atlas VPC Peering documentation: https://www.mongodb.com/docs/atlas/security-vpc-peering/
- MongoDB Atlas API - Create One New Network Peering Connection: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Network-Peering
- MongoDB Atlas API - Create Access List Entries: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Project-IP-Access-List
- AWS CLI ec2 accept-vpc-peering-connection: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-vpc-peering-connection.html
- AWS CLI ec2 create-route: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI ec2 authorize-security-group-egress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- AWS VPC Peering security group reference limitations: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html

## Issues Found
- **Step 5 (Security Groups): Incorrect security group configuration.** The original post used `authorize-security-group-ingress` on `sg-youratlasSG` with `--source-group sg-yourappSG`. This was wrong for two reasons: (1) Atlas-managed security groups are controlled by MongoDB and cannot be modified from the user's AWS account, and (2) cross-account security group references are not supported in VPC peering connections. Fixed by changing the command to `authorize-security-group-egress` on the user's own application security group (`sg-yourappSG`) with a CIDR-based rule targeting the Atlas VPC CIDR on port 27017, and added a note clarifying that Atlas manages its own security groups and access is controlled via the IP Access List.

## Review Notes
- The Atlas API v1.0 endpoints used in the post are correct but MongoDB has been migrating to the v2.0 API. The v1.0 API still works but authors may want to update to v2.0 endpoints in the future.
- The default Atlas CIDR of 192.168.248.0/21 is correct for AWS deployments.
- The post correctly notes that Atlas supports Azure (VNet peering) and GCP in addition to AWS, but only covers AWS steps. This is clearly stated and acceptable.
- Most AWS security groups allow all outbound traffic by default, so Step 5 may be unnecessary for many users. The post now correctly notes this is only needed if outbound traffic is restricted.
