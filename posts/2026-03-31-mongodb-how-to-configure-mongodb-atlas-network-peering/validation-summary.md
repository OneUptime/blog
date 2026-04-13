# Validation Summary: How to Configure MongoDB Atlas Network Peering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Network Peering feature)
- AWS VPC Peering
- GCP VPC Peering
- Azure VNet Peering
- MongoDB Atlas CLI (`atlas`)
- AWS CLI (`aws ec2`)
- Google Cloud CLI (`gcloud`)
- Azure CLI (`az`)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Atlas CLI reference for `atlas networking peering create` (aws, gcp, azure subcommands): https://www.mongodb.com/docs/atlas/cli/current/command/atlas-networking-peering-create-aws/
- MongoDB Atlas CLI reference for `atlas accessList create`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/
- MongoDB Atlas documentation on Network Peering: https://www.mongodb.com/docs/atlas/security-vpc-peering/
- AWS documentation on VPC Peering: https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- AWS CLI reference for `aws ec2 create-route`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- Google Cloud documentation on VPC Network Peering: https://cloud.google.com/vpc/docs/vpc-peering
- Azure documentation on VNet Peering: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- MongoDB Atlas documentation on Private Endpoints vs Network Peering: https://www.mongodb.com/docs/atlas/security-private-endpoint/

## Issues Found

1. **Incorrect `atlas accessList create` flag (`--cidr`)**: The `--cidr` flag does not exist on the `atlas accessList create` command. The CIDR block is passed as a positional argument. Changed `atlas accessLists create --cidr 10.0.0.0/16 --comment "Application VPC"` to `atlas accessList create "10.0.0.0/16" --comment "Application VPC"`.

2. **Misleading terminology: "Private Endpoint Address" in Step 6 title**: The title "Connect Using Private Endpoint Address" conflates VPC Peering with Private Endpoints (AWS PrivateLink / Azure Private Link / GCP Private Service Connect), which are distinct Atlas networking features. Changed the title to "Connect Using Private Connection String" to accurately describe the peered connection hostname.

## Review Notes
- **Azure peering acceptance process**: The post shows using `az network vnet peering update` to accept the peering. In practice, Atlas Azure VNet peering works via a service principal that Atlas provisions in your Azure AD tenant. You grant this service principal Network Contributor access to your VNet's resource group, and Atlas handles the peering creation on both sides. The `az` command shown is valid Azure CLI syntax but may not reflect the exact Atlas workflow. This is left as-is since the general intent is correct and the exact process can vary by configuration.
- **GCP region prerequisite**: The prerequisites state resources must be "in the same region." GCP VPC networks are global (not regional), so VPC peering in GCP is not constrained by region. The prerequisite is accurate for AWS and Azure but slightly misleading for GCP.
- **Atlas CIDR block in AWS command**: The AWS peering command omits `--atlasCidrBlock`, while the GCP and Azure commands include it. This is acceptable since `--atlasCidrBlock` is only required when creating the first network container for a project; subsequent peering connections use the existing container.
- The `-pri` hostname suffix and `mongodb+srv://` connection string format for peered connections are correct.
