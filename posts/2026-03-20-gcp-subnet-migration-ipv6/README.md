# How to Change GCP Subnets from IPv4-Only to Dual-Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Subnet Migration, Dual-Stack, Google Cloud, VPC

Description: Migrate existing Google Cloud VPC subnets from IPv4-only to dual-stack without recreating VMs or losing connectivity, and verify the migration with running workloads.

## Introduction

Google Cloud allows in-place conversion of existing IPv4-only subnets to dual-stack by updating `stack-type` to `IPV4_IPV6`. This migration is non-disruptive - existing VMs keep their IPv4 addresses and connectivity during the update. Dual-stack subnets are supported only on custom-mode VPC networks, and `INTERNAL` IPv6 requires a `/48` ULA internal IPv6 range to already be enabled on the VPC network. After the subnet is upgraded, update each VM network interface to `IPV4_IPV6` so Google Cloud can assign an IPv6 range from the subnet. The `ipv6-access-type` (EXTERNAL or INTERNAL) is chosen when IPv6 is first enabled on the subnet and cannot be changed afterward.

## Migrate Subnet to Dual-Stack

```bash
PROJECT="my-project"
REGION="us-east1"

# Check current subnet configuration

gcloud compute networks subnets describe existing-subnet \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="json(stackType, ipCidrRange, ipv6CidrRange)"

# Current output: stackType: IPV4_ONLY, no ipv6CidrRange

# Upgrade subnet to dual-stack with EXTERNAL IPv6
gcloud compute networks subnets update existing-subnet \
    --region="$REGION" \
    --project="$PROJECT" \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL

# Verify the IPv6 CIDR was assigned
gcloud compute networks subnets describe existing-subnet \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="table(name, stackType, ipCidrRange, ipv6CidrRange, ipv6AccessType)"

# Expected output:
# stackType: IPV4_IPV6
# ipv6CidrRange: 2600:1900:4000:xxxx::/64 (or similar)
# ipv6AccessType: EXTERNAL
```

## Update VMs to Receive IPv6 After Subnet Migration

```bash
ZONE="us-east1-b"

# After subnet is dual-stack, update existing VMs
# Method 1: Update network interface stack type in place
gcloud compute instances network-interfaces update vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --network-interface=nic0 \
    --stack-type=IPV4_IPV6 \
    --ipv6-network-tier=PREMIUM

# Method 2: Stop VM, update the network interface, then start
gcloud compute instances stop vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE"

gcloud compute instances network-interfaces update vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --network-interface=nic0 \
    --stack-type=IPV4_IPV6 \
    --ipv6-network-tier=PREMIUM

gcloud compute instances start vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE"

# Verify VM received IPv4 and external IPv6
gcloud compute instances describe vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --format="get(networkInterfaces[0].networkIP)"

gcloud compute instances describe vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --format="get(networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)"

# For INTERNAL IPv6 subnets, use networkInterfaces[0].ipv6Address instead.
```

## Migration Script for Multiple VMs

```bash
#!/bin/bash
PROJECT="my-project"
REGION="us-east1"
ZONE="us-east1-b"
SUBNET_NAME="existing-subnet"

echo "=== Step 1: Upgrading subnet to dual-stack ==="
gcloud compute networks subnets update "$SUBNET_NAME" \
    --region="$REGION" \
    --project="$PROJECT" \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL

echo "Subnet upgraded. Waiting for propagation..."
sleep 10

echo "=== Step 2: Listing VMs in subnet ==="
VMS=$(gcloud compute instances list \
    --project="$PROJECT" \
    --filter="networkInterfaces.subnetwork:$SUBNET_NAME AND zone:$ZONE" \
    --format="get(name)")

echo "VMs to update: $VMS"

echo "=== Step 3: Updating VM network interfaces ==="
for VM in $VMS; do
    echo "Updating VM: $VM"
    gcloud compute instances network-interfaces update "$VM" \
        --project="$PROJECT" \
        --zone="$ZONE" \
        --network-interface=nic0 \
        --stack-type=IPV4_IPV6 \
        --ipv6-network-tier=PREMIUM
    echo "VM $VM updated"
done

echo "=== Step 4: Verifying IPv6 assignments ==="
for VM in $VMS; do
    IPV6=$(gcloud compute instances describe "$VM" \
        --project="$PROJECT" \
        --zone="$ZONE" \
        --format="get(networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)")
    echo "VM: $VM - IPv6: ${IPV6:-NOT ASSIGNED}"
done
```

## Terraform: Add IPv6 to Existing Subnet Resource

```hcl
# Before: IPv4-only subnet
# resource "google_compute_subnetwork" "existing" {
#   name          = "existing-subnet"
#   ip_cidr_range = "10.0.1.0/24"
#   region        = "us-east1"
#   network       = google_compute_network.main.id
# }

# After: Dual-stack subnet (update in place, no recreation)
resource "google_compute_subnetwork" "existing" {
  name          = "existing-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id  # custom-mode VPC network
  project       = var.project_id

  # Added: enable dual-stack
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "EXTERNAL"  # use INTERNAL only if the VPC has enable_ula_internal_ipv6 = true
}
```

## Verify Migration Success

```bash
# Check subnet has IPv6 CIDR
gcloud compute networks subnets describe existing-subnet \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="get(ipv6CidrRange)"

# Check VMs have external IPv6
gcloud compute instances list \
    --project="$PROJECT" \
    --format="table(name, zone, networkInterfaces[0].networkIP, networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)"

# For INTERNAL IPv6 subnets, use networkInterfaces[0].ipv6Address instead.

# SSH into a VM and verify IPv6
gcloud compute ssh vm-existing --zone="$ZONE" --project="$PROJECT"
# Inside VM:
ip -6 addr show
# If you used EXTERNAL IPv6, test internet reachability
ping -6 -c 3 2001:4860:4860::8888
```

## Conclusion

Migrating GCP subnets from IPv4-only to dual-stack is a non-destructive in-place operation using `gcloud compute networks subnets update --stack-type=IPV4_IPV6 --ipv6-access-type=EXTERNAL|INTERNAL`. Existing VMs retain their IPv4 connectivity during the upgrade. After the subnet is upgraded, update each VM's network interface to `IPV4_IPV6` so Google Cloud can assign an IPv6 range. In Terraform, adding `stack_type` and `ipv6_access_type` to the existing subnetwork resource updates the subnet in place the first time you convert it to dual-stack. Use a custom-mode VPC, and if you choose `INTERNAL`, enable ULA internal IPv6 on the VPC network first. Choose `ipv6-access-type` carefully - it cannot be changed after IPv6 is enabled on the subnet.
