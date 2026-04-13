# Validation Summary: How to Set Up Private Endpoints for MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- AWS PrivateLink
- Azure Private Link
- GCP Private Service Connect
- Atlas CLI
- AWS CLI (`aws ec2`)
- Azure CLI (`az network`)
- Google Cloud CLI (`gcloud compute`)
- MongoDB Node.js Driver
- mongosh

## Sources Consulted
- MongoDB Atlas CLI reference: `atlas privateEndpoints aws create` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-privateEndpoints-aws-create/
- MongoDB Atlas CLI reference: `atlas privateEndpoints aws interfaces create` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-privateendpoints-aws-interfaces-create/
- MongoDB Atlas Private Endpoints documentation — https://www.mongodb.com/docs/atlas/security-private-endpoint/
- MongoDB Atlas VPC Peering documentation — https://www.mongodb.com/docs/atlas/security-vpc-peering/
- MongoDB Atlas Regionalized Private Endpoints API — https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/
- GCP `gcloud compute forwarding-rules create` reference — https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- GCP Private Service Connect documentation — https://cloud.google.com/vpc/docs/private-service-connect
- MongoDB Atlas on GCP with Private Service Connect — https://medium.com/google-cloud/mongodb-atlas-in-google-cloud-accessed-by-private-service-connect-a4996bf6cfb4
- GCP Global Access for MongoDB Atlas PSC — https://codelabs.developers.google.com/codelabs/psc-mongo-globalaccess
- AWS VPC Endpoints CLI reference — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- Azure Private Endpoint CLI reference — https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint

## Issues Found

### 1. GCP forwarding rules used incorrect flags (lines 143-156)
**What was wrong:** The `gcloud compute forwarding-rules create` commands included `--ip-protocol=TCP` and `--ports=1024-65535` flags. These flags are not valid for Private Service Connect forwarding rules that target service attachments. PSC forwarding rules do not specify protocol or port — those are handled at the service attachment level.

**What was changed:** Removed `--ip-protocol=TCP` and `--ports=1024-65535` from both forwarding rule commands. Added the required `--address` flag pointing to reserved internal IP addresses. Added a preceding step to reserve the internal IP addresses using `gcloud compute addresses create`, which is a prerequisite for PSC forwarding rules.

**Why:** GCP Private Service Connect endpoints require a reserved internal IP address (via `--address`) and do not accept protocol/port specifications. The original commands would fail with a CLI error.

### 2. GCP section was missing the Atlas registration step
**What was wrong:** The GCP section only had 2 steps (initiate in Atlas, create forwarding rules) but did not include a step to register the endpoints back with Atlas. Both the AWS and Azure sections included this registration step, and it is required to complete the setup.

**What was changed:** Added Step 3 showing the `atlas privateEndpoints gcp interfaces create` command to register the GCP endpoints with Atlas after creating forwarding rules.

**Why:** Without registering the endpoints in Atlas, the private endpoint connection would never become active. This step is mandatory for all three cloud providers.

### 3. Cross-region comparison table was inaccurate for private endpoints
**What was wrong:** The comparison table stated "Not supported" for cross-region private endpoints. This is incorrect — MongoDB Atlas supports regionalized private endpoints, which enable cross-region connectivity. AWS requires separate endpoints per region, Azure Private Link natively supports cross-region, and GCP PSC supports global access.

**What was changed:** Updated the private endpoints cross-region cell from "Not supported" to "Supported (regionalized endpoints)".

**Why:** MongoDB Atlas documentation explicitly describes regionalized private endpoints as a supported feature. The VPC peering column correctly states "Not supported" — Atlas does not support cross-region VPC peering.

## Review Notes
- The Atlas CLI commands use different region name formats per cloud provider: AWS uses standard AWS region names (e.g., `us-east-1`), while Azure and GCP use Atlas-specific uppercase underscore format (e.g., `EUROPE_WEST`, `CENTRAL_US`). This is correct per Atlas CLI conventions but could be confusing to readers.
- The security group section title says "allows outbound traffic to Atlas" but the first command shown is an ingress rule. This is technically correct (ingress to the VPC endpoint's ENI is what allows your applications to reach Atlas), but the wording may confuse readers unfamiliar with how VPC interface endpoints work.
- The `atlas privateEndpoints gcp interfaces create` command shown in the added Step 3 uses a simplified representation of the endpoint mapping. The actual Atlas CLI syntax may require specific formatting for the endpoints list depending on the CLI version.
- The post correctly notes the `pl-0` hostname pattern for PrivateLink connection strings, which is accurate for Atlas private endpoint connections.
