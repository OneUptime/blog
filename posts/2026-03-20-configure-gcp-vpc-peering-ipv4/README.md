# How to Configure VPC Network Peering for IPv4 in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Peering, IPv4, Networking, Cloud, Connectivity

Description: Set up GCP VPC Network Peering to enable private IPv4 communication between two VPC networks, including peering across different projects and configuring route exchange.

## Introduction

GCP VPC Network Peering connects two VPC networks so instances in each can communicate using internal IPv4 addresses. Peering works within the same project or across projects (even across organizations). It is non-transitive and both VPCs must have non-overlapping CIDR ranges.

## Prerequisites

Both VPCs must have non-overlapping IPv4 subnets. Check current ranges:

```bash
PROJECT_A="project-a"
PROJECT_B="project-b"

gcloud compute networks subnets list --project=$PROJECT_A --network=vpc-a
gcloud compute networks subnets list --project=$PROJECT_B --network=vpc-b
```

## Creating the Peering Connection (Both Sides Required)

```bash
# In Project A: peer to Project B's VPC

gcloud compute networks peerings create a-to-b \
  --project=$PROJECT_A \
  --network=vpc-a \
  --peer-project=$PROJECT_B \
  --peer-network=vpc-b \
  --export-custom-routes \
  --import-custom-routes

# In Project B: peer to Project A's VPC
gcloud compute networks peerings create b-to-a \
  --project=$PROJECT_B \
  --network=vpc-b \
  --peer-project=$PROJECT_A \
  --peer-network=vpc-a \
  --export-custom-routes \
  --import-custom-routes
```

## Verifying Peering Status

```bash
# Check peering state (should be "ACTIVE")
gcloud compute networks peerings list \
  --project=$PROJECT_A \
  --network=vpc-a

# Describe the network for full peering details
gcloud compute networks describe vpc-a \
  --project=$PROJECT_A
```

The `STATE` column should show `ACTIVE` in `peerings list`. In `gcloud compute networks describe`, check the `peerings.connectionStatus` field.

## Testing Connectivity

```bash
# SSH into a VM in VPC A and ping a VM in VPC B by internal IP
gcloud compute ssh vm-in-vpc-a \
  --project=$PROJECT_A \
  --zone=us-central1-a \
  --command="ping -c 3 10.2.1.5"
```

Note: Firewall rules in VPC B must allow ingress from VPC A's CIDR.

```bash
# Allow ping from VPC A subnet to VPC B instances
gcloud compute firewall-rules create allow-from-vpc-a \
  --project=$PROJECT_B \
  --network=vpc-b \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=icmp,tcp:22 \
  --source-ranges=10.1.0.0/16
```

## Exporting and Importing Custom Routes

By default, subnet routes are exchanged. Custom routes, including static routes, require explicit configuration:

```bash
# Update peering to export custom routes from Project A
gcloud compute networks peerings update a-to-b \
  --project=$PROJECT_A \
  --network=vpc-a \
  --export-custom-routes

# Project B imports those custom routes
gcloud compute networks peerings update b-to-a \
  --project=$PROJECT_B \
  --network=vpc-b \
  --import-custom-routes
```

## Listing Peering Routes

```bash
# View routes learned via peering
gcloud compute networks peerings list-routes a-to-b \
  --project=$PROJECT_A \
  --network=vpc-a \
  --region=us-central1 \
  --direction=INCOMING
```

## Deleting a Peering

```bash
gcloud compute networks peerings delete a-to-b \
  --project=$PROJECT_A \
  --network=vpc-a --quiet
```

## Peering Limitations

| Limitation | Detail |
|---|---|
| Transitive routing | Not supported |
| Overlapping CIDRs | Not allowed |
| Max peerings per VPC | Subject to the `Peerings per VPC network` quota |
| DNS resolution | Internal DNS names are not shared automatically; use Cloud DNS peering zones or authorize private zones separately |

## Conclusion

GCP VPC peering requires both VPCs to create peering links. Both must be `ACTIVE` for traffic to flow. Ensure firewall rules allow traffic from the peered VPC's CIDR. For custom routes, explicitly enable `--export-custom-routes` on the exporting side and `--import-custom-routes` on the importing side.
