# How to Fix Overlapping IP Range Errors When Setting Up VPC Peering in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Peering, IP Ranges, Networking, Troubleshooting

Description: A troubleshooting guide for resolving overlapping IP range errors during VPC peering setup in GCP, with practical strategies for re-addressing subnets and alternative connectivity options.

---

You have two VPC networks that need to talk to each other. You set up VPC peering, and GCP immediately rejects it with an error about overlapping IP ranges. This is one of the most common networking headaches in GCP, and it usually traces back to IP planning decisions made months or years ago.

In this post, I will explain why overlapping IP ranges block peering, how to identify the exact conflicts, and what your options are for fixing them.

## Why VPC Peering Requires Non-Overlapping Ranges

VPC peering creates a direct routing path between two networks. When networks are peered, routes from one network are imported into the other. If both networks have a subnet using 10.0.0.0/24, the router cannot determine which network should receive traffic destined for 10.0.0.5 - it could be either one.

GCP prevents this ambiguity by checking all IP ranges (primary subnets, secondary ranges, and any allocated ranges) before establishing the peering. If any range in network A overlaps with any range in network B, the peering request fails.

## Identifying the Overlapping Ranges

When peering fails, the error message usually tells you which ranges overlap. But you can also investigate manually:

```bash
# List all subnets and their IP ranges in VPC A
gcloud compute networks subnets list \
  --network=vpc-a \
  --format="table(name, region, ipCidrRange, secondaryIpRanges[].ipCidrRange:label=SECONDARY)"
```

```bash
# List all subnets and their IP ranges in VPC B
gcloud compute networks subnets list \
  --network=vpc-b \
  --format="table(name, region, ipCidrRange, secondaryIpRanges[].ipCidrRange:label=SECONDARY)"
```

Also check for allocated ranges used by Private Service Access:

```bash
# Check allocated ranges for managed services in VPC A
gcloud compute addresses list \
  --global \
  --filter="purpose=VPC_PEERING AND network:vpc-a" \
  --format="table(name, address, prefixLength)"
```

```bash
# Check allocated ranges for managed services in VPC B
gcloud compute addresses list \
  --global \
  --filter="purpose=VPC_PEERING AND network:vpc-b" \
  --format="table(name, address, prefixLength)"
```

Compare the outputs and look for any CIDR blocks that overlap. Remember that 10.0.0.0/16 overlaps with 10.0.1.0/24 because the /16 contains the /24.

## Common Overlap Scenarios

### Auto Mode VPCs

Both networks are auto mode VPCs. Since auto mode always creates subnets using the same predefined ranges (10.128.0.0/20 in us-central1, 10.138.0.0/20 in us-east1, etc.), they will always overlap:

```bash
# Check if either VPC is in auto mode
gcloud compute networks describe vpc-a --format="value(autoCreateSubnetworks)"
gcloud compute networks describe vpc-b --format="value(autoCreateSubnetworks)"
```

If either returns `True`, that is likely your problem.

### Overlapping Private Service Access Ranges

Even if your subnets do not overlap, the IP ranges allocated for Private Service Access (used by Cloud SQL, AlloyDB, etc.) might:

```bash
# List PSA ranges in both networks
gcloud compute addresses list --global \
  --filter="purpose=VPC_PEERING" \
  --format="table(name, address, prefixLength, network)"
```

## Fix 1: Re-Address a Subnet

If the overlapping subnet is small and relatively easy to migrate, you can create a new subnet with a non-overlapping range and move your resources:

```bash
# Create a replacement subnet with a non-overlapping range
gcloud compute networks subnets create vpc-a-us-central1-v2 \
  --network=vpc-a \
  --region=us-central1 \
  --range=10.50.0.0/20 \
  --enable-private-ip-google-access
```

Then migrate VMs to the new subnet. For each VM, you need to stop it, change the network interface, and restart:

```bash
# Stop the VM
gcloud compute instances stop my-vm --zone=us-central1-a

# Delete the old network interface and add a new one pointing to the new subnet
# Note: this requires recreating the VM or using instance templates
gcloud compute instances delete my-vm --zone=us-central1-a --keep-disks=all

gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --subnet=vpc-a-us-central1-v2 \
  --disk=name=my-vm,boot=yes \
  --no-address
```

After migrating all resources off the old subnet, delete it:

```bash
# Delete the old overlapping subnet
gcloud compute networks subnets delete vpc-a-us-central1-old \
  --region=us-central1 --quiet
```

## Fix 2: Convert Auto Mode to Custom Mode

If the overlap is caused by auto mode subnets, convert to custom mode and delete the unused subnets:

```bash
# Convert to custom mode (this is irreversible)
gcloud compute networks update vpc-a --switch-to-custom-subnet-mode

# Delete subnets in regions you do not use
gcloud compute networks subnets delete vpc-a-subnet-asia-east1 \
  --region=asia-east1 --quiet

gcloud compute networks subnets delete vpc-a-subnet-europe-west1 \
  --region=europe-west1 --quiet
```

For subnets you do use, re-address them with non-overlapping ranges as described above.

## Fix 3: Use Partial Subnet Peering with Custom Route Exchange

If you cannot re-address subnets, you can selectively export and import routes. This does not fix the fundamental overlap, but it lets you control which routes are shared:

```bash
# Create peering from VPC A to VPC B with custom route exchange
gcloud compute networks peerings create vpc-a-to-vpc-b \
  --network=vpc-a \
  --peer-network=vpc-b \
  --export-custom-routes \
  --import-custom-routes \
  --no-export-subnet-routes-with-public-ip
```

However, this still will not work if the subnet ranges themselves overlap. Custom route exchange only helps with custom static routes, not subnet routes.

## Fix 4: Use a Proxy or VPN Instead of Peering

If re-addressing is not feasible, consider alternatives to VPC peering:

### Internal Load Balancer as a Proxy

Set up an internal load balancer in one VPC that forwards traffic to the other VPC through a proxy VM:

```bash
# Create a proxy VM with two network interfaces
gcloud compute instances create proxy-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --network-interface=network=vpc-a,subnet=vpc-a-subnet \
  --network-interface=network=vpc-b,subnet=vpc-b-subnet \
  --can-ip-forward \
  --metadata=startup-script='#!/bin/bash
    sysctl -w net.ipv4.ip_forward=1
    iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE'
```

### HA VPN Between VPCs

Another option is connecting the VPCs with HA VPN instead of peering. VPN supports overlapping ranges because you can use NAT:

```bash
# Create HA VPN gateways in both VPCs
gcloud compute vpn-gateways create vpn-gw-vpc-a \
  --network=vpc-a \
  --region=us-central1

gcloud compute vpn-gateways create vpn-gw-vpc-b \
  --network=vpc-b \
  --region=us-central1
```

## Fix 5: Re-Address Private Service Access Ranges

If the overlap is in PSA ranges, you can reallocate them:

```bash
# Create a new non-overlapping PSA range
gcloud compute addresses create psa-range-v2 \
  --global \
  --purpose=VPC_PEERING \
  --addresses=10.200.0.0 \
  --prefix-length=20 \
  --network=vpc-a

# Update the peering connection to use the new range
gcloud services vpc-peerings update \
  --service=servicenetworking.googleapis.com \
  --ranges=psa-range-v2 \
  --network=vpc-a
```

Note that this may require recreating managed service instances (Cloud SQL, AlloyDB, etc.) that are using the old range.

## Prevention: IP Planning Best Practices

The best fix is prevention. Here is how to avoid overlapping ranges in the first place:

1. **Use custom mode VPCs** from day one. Never use auto mode for production.
2. **Maintain a central IP allocation registry** that all teams reference before creating subnets.
3. **Assign each VPC a non-overlapping /16 block** from your private IP space. This gives each VPC 65,536 addresses and guarantees no overlaps.
4. **Reserve blocks for future VPCs** so that when new projects come along, there is already an allocation plan.

A simple allocation scheme:

| VPC | Block |
|-----|-------|
| production | 10.10.0.0/16 |
| staging | 10.20.0.0/16 |
| development | 10.30.0.0/16 |
| shared-services | 10.40.0.0/16 |
| PSA ranges | 10.200.0.0/16 |

## Wrapping Up

Overlapping IP ranges during VPC peering setup are frustrating but fixable. The approach depends on your constraints - re-addressing subnets is cleanest but most disruptive, while proxy VMs and VPNs provide workarounds when re-addressing is not practical. Whatever path you choose, take the time afterward to establish an IP allocation plan that prevents this problem from recurring. A few hours of planning beats days of re-architecting.
