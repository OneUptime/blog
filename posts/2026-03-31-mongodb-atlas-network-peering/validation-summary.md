# Validation Summary: How to Manage MongoDB Atlas Network Peering

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB Atlas (Network Peering, IP Access Lists, Connection Strings)
- AWS VPC Peering (EC2 CLI, Security Groups, Route Tables)
- Azure VNet Peering (Azure CLI, Virtual Networks)
- MongoDB Atlas CLI (`atlas networking`, `atlas accessLists`, `atlas clusters`)
- MongoDB Atlas Administration API v2
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB Atlas documentation on VPC Peering: https://www.mongodb.com/docs/atlas/security-vpc-peering/
- MongoDB Atlas CLI reference for `atlas networking peering create aws`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-networking-peering-create-aws/
- MongoDB Atlas CLI reference for `atlas networking peering create azure`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-networking-peering-create-azure/
- MongoDB Atlas API v2 Peers endpoint: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Network-Peering
- MongoDB Atlas connection string types (standard vs private endpoint): https://www.mongodb.com/docs/atlas/connect-to-database-deployment/
- AWS CLI v2 `authorize-security-group-egress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- AWS CLI v2 `authorize-security-group-ingress` reference (for shorthand flag comparison): https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found

1. **Typo in Requirements section (line 27)**: "IAM/IAM permissions" was a duplication typo. Fixed to "IAM permissions".

2. **Incorrect flags on `aws ec2 authorize-security-group-egress` (lines 86-93)**: The command used `--protocol`, `--port`, and `--cidr` shorthand flags, which are only available on `authorize-security-group-ingress`, not on `authorize-security-group-egress`. The egress command requires the `--ip-permissions` parameter. Fixed to use `--ip-permissions IpProtocol=tcp,FromPort=27017,ToPort=27017,IpRanges='[{CidrIp=192.168.0.0/21}]'`.

3. **Missing required `--directoryId` flag for Azure peering (lines 113-121)**: The `atlas networking peering create azure` command was missing the `--directoryId` flag, which specifies the Azure AD Directory (Tenant) ID and is required for Azure VNet peering. Added `--directoryId "your-azure-ad-directory-id"` to the command.

4. **Incorrect connection string type for VPC peering (lines 138-152)**: The post told users to look for the `private` or `privateSrv` connection string field and showed a `-private` hostname in the example URI. These connection string types are for Private Endpoints (AWS PrivateLink / Azure Private Link), not for VPC peering. With VPC peering, the standard connection string is used — the standard hostnames automatically resolve to private IPs when DNS queries originate from within the peered VPC. Fixed the text to reference `standard`/`standardSrv` and updated the example URI to use a standard hostname.

## Review Notes
- The peering status table lists statuses INITIATING, PENDING_ACCEPTANCE, FINALIZING, AVAILABLE, and FAILED. The exact status names may vary slightly by cloud provider (e.g., AWS peering may show WAITING_FOR_USER instead of PENDING_ACCEPTANCE in some contexts). The listed statuses are reasonable representations but users should verify against their actual `atlas networking peering list` output.
- The post covers AWS and Azure peering but the title and description mention GCP as well. GCP VPC peering setup is not covered in the post body. This is not a technical error but a gap in coverage.
- The `172.16.0.0/12` CIDR mentioned as a "common safe choice" is quite large (covers 172.16.0.0 through 172.31.255.255). While technically valid, most deployments would use a more specific range like `172.16.0.0/16`. This is not incorrect but could be worth noting in a future update.
- The JavaScript code example uses top-level `await` which requires ES modules or a top-level async context. This is standard modern Node.js practice and not an error, but it may not work in older Node.js CommonJS setups.
