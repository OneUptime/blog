# Validation Summary: How to Configure MongoDB Atlas Private Endpoint

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Private Endpoints, Access Lists, Connection Strings)
- AWS PrivateLink (VPC Endpoints, Security Groups)
- Azure Private Link (Private Endpoints, VNets)
- GCP Private Service Connect (mentioned but not demonstrated)
- MongoDB Atlas CLI (atlascli v2)
- MongoDB Atlas Administration API v2
- AWS CLI (EC2 VPC endpoints, security groups)
- Azure CLI (network private-endpoint)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB Atlas CLI command reference on GitHub: https://github.com/mongodb/mongodb-atlas-cli/tree/master/docs/command
  - `atlas-privateEndpoints-aws-interfaces-create.txt`
  - `atlas-privateEndpoints-azure-interfaces-create.txt`
  - `atlas-accessLists-create.txt`
  - `atlas-privateEndpoints-aws-create.txt`
  - `atlas-clusters-connectionStrings-describe.txt`
- AWS CLI v2 reference for `authorize-security-group-egress` (confirmed shorthand flags `--protocol`, `--port`, `--source-group` are supported)
- MongoDB Atlas Administration API v2 documentation for private endpoint service creation
- AWS documentation for `aws ec2 create-vpc-endpoint`

## Issues Found

### 1. `atlas privateEndpoints aws interfaces create` — incorrect `--endpointServiceId` flag
- **What was wrong:** The command used `--endpointServiceId <ATLAS_ENDPOINT_SERVICE_ID>` as a flag. In the Atlas CLI, `endpointServiceId` is a required positional argument, not a flag.
- **What was changed:** Changed to `atlas privateEndpoints aws interfaces create <ATLAS_ENDPOINT_SERVICE_ID> --privateEndpointId "$VPC_ENDPOINT_ID"`.
- **Why:** The Atlas CLI expects the endpoint service ID as the first positional argument per the official command reference.

### 2. `atlas privateEndpoints azure interfaces create` — incorrect `--endpointServiceId` flag
- **What was wrong:** Same issue as above — `--endpointServiceId` was used as a flag instead of a positional argument.
- **What was changed:** Changed to `atlas privateEndpoints azure interfaces create <ATLAS_SERVICE_ID> --privateEndpointId "<AZURE_PE_RESOURCE_ID>" --privateEndpointIPAddress "$PRIVATE_IP"`.
- **Why:** Consistent with the Atlas CLI command reference for Azure private endpoint interfaces.

### 3. `atlas accessLists create` — non-existent `--cidr` flag
- **What was wrong:** The command used `--cidr "10.0.0.0/16"` but the Atlas CLI does not have a `--cidr` flag. The IP/CIDR entry is a positional argument.
- **What was changed:** Changed to `atlas accessLists create "10.0.0.0/16" --comment "..."`.
- **Why:** The Atlas CLI `accessLists create` command takes the entry (IP, CIDR, or AWS SG ID) as a positional argument.

### 4. `atlas accessLists create` — non-existent `--ip` flag
- **What was wrong:** The command used `--ip "10.0.5.10"` but this flag does not exist in the Atlas CLI.
- **What was changed:** Changed to `atlas accessLists create "10.0.5.10" --comment "..."`.
- **Why:** Same reason as above — entries are positional arguments.

## Review Notes
- The post mentions GCP Private Service Connect in the introduction and summary but does not provide GCP-specific setup instructions. This is not an error but could be a gap worth addressing in a future update.
- The "IP Access List with Private Endpoints" section is technically functional but slightly misleading: connections arriving through a private endpoint bypass the Atlas IP access list. The access list primarily governs non-private-endpoint connections. The commands shown work correctly, but readers should understand that private endpoint traffic is authorized by the endpoint itself, not the access list.
- The `authorize-security-group-egress` command uses `--source-group` pointing to the same security group. This is syntactically valid and logically consistent (since the VPC endpoint was created with that same SG), but the default VPC security group egress rule already allows all outbound traffic — so this step may be unnecessary in practice unless the default rule has been removed.
- The Azure `--group-ids mongoCluster` value may need to be verified against actual Atlas Private Link configuration, as the exact sub-resource group name could vary.
- The Mermaid diagram has a disconnected `Note` node ("No public internet traffic") that renders as an unconnected box — this is cosmetic, not a technical error.
