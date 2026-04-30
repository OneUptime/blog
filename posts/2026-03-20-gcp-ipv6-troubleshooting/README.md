# How to Troubleshoot GCP IPv6 Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Troubleshooting, Connectivity, Debugging, Google Cloud

Description: Diagnose and fix common GCP IPv6 connectivity problems including address assignment failures, routing issues, firewall blocks, and DNS resolution failures on Google Cloud.

## Introduction

GCP IPv6 troubleshooting involves checking the subnet stack type, VM network interface configuration, firewall rules for IPv6 traffic, and DNS AAAA record resolution. Common issues include VMs not receiving IPv6 addresses after subnet migration, firewall rules blocking ICMPv6, missing routes, and DNS returning only A records. This guide provides diagnostic commands and fixes for the most common GCP IPv6 problems.

## Diagnostic Script

```bash
#!/bin/bash
PROJECT="my-project"
ZONE="us-east1-b"
VM_NAME="vm-to-check"
SUBNET_NAME="subnet-web"
REGION="us-east1"

echo "=== 1. Check Subnet IPv6 Configuration ==="
gcloud compute networks subnets describe "$SUBNET_NAME" \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="table(name, stackType, ipv6AccessType, internalIpv6Prefix, externalIpv6Prefix)"

echo ""
echo "=== 2. Check VM IPv6 Address ==="
gcloud compute instances describe "$VM_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --format="flattened(name, networkInterfaces[].stackType, networkInterfaces[].networkIP, networkInterfaces[].ipv6Address, networkInterfaces[].ipv6AccessConfigs[].externalIpv6)"

echo ""
echo "=== 3. Check Firewall Rules for IPv6 ==="
gcloud compute firewall-rules list \
    --project="$PROJECT" \
    --filter="network:vpc-main" \
    --format="table(name, direction, sourceRanges, destinationRanges, allowed, disabled)"

echo ""
echo "=== 4. Check IPv6 Routes ==="
gcloud compute routes list \
    --project="$PROJECT" \
    --filter="network:vpc-main" \
    --format="table(name, destRange, nextHopGateway, priority)"
```

## Fix: VM Not Receiving IPv6 Address

```bash
# Problem: VM in dual-stack subnet has no IPv6 address

# Diagnosis:
gcloud compute instances describe vm-name \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --format="flattened(networkInterfaces[0].stackType, networkInterfaces[0].ipv6Address, networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)"
# Returns: IPv6 fields are empty

# Fix: Update VM network interface to enable IPv6
gcloud compute instances network-interfaces update vm-name \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --network-interface=nic0 \
    --stack-type=IPV4_IPV6

# Verify fix
gcloud compute instances describe vm-name \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --format="flattened(networkInterfaces[0].stackType, networkInterfaces[0].ipv6Address, networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)"
```

## Fix: IPv6 Ping Fails (Firewall Issue)

```bash
# Problem: inbound ping6 to the VM fails
# Diagnosis: List IPv6 ingress rules and confirm one allows protocol 58 (ICMPv6)
gcloud compute firewall-rules list \
    --project="$PROJECT" \
    --filter="network:vpc-main AND direction=INGRESS" \
    --format="table(name, sourceRanges, allowed, targetTags)"

# Fix: Create ICMPv6 allow rule
gcloud compute firewall-rules create allow-icmpv6 \
    --project="$PROJECT" \
    --network=vpc-main \
    --action=ALLOW \
    --direction=INGRESS \
    --priority=900 \
    --source-ranges="::/0" \
    --rules=58

# Test again from an IPv6-capable host
ping6 VM_EXTERNAL_IPV6
```

## Fix: IPv6 Traffic Blocked Despite Firewall Rule

```bash
# Problem: Firewall rule exists but traffic is still blocked
# Check if VM tags match firewall rule target tags

# View VM tags
gcloud compute instances describe vm-name \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --format="get(tags.items)"

# View firewall rule target tags
gcloud compute firewall-rules describe allow-web-ipv6 \
    --project="$PROJECT" \
    --format="get(targetTags)"

# If tags don't match, add tag to VM
gcloud compute instances add-tags vm-name \
    --zone="$ZONE" \
    --project="$PROJECT" \
    --tags=web-server

# Or clear target-tags from the firewall rule to apply it to all VMs
gcloud compute firewall-rules update allow-web-ipv6 \
    --project="$PROJECT" \
    --target-tags
```

## Fix: No Default IPv6 Route

```bash
# Problem: VM has IPv6 address but cannot reach internet
# Diagnosis: Check default route exists
gcloud compute routes list \
    --project="$PROJECT" \
    --filter="destRange=::/0" \
    --format="table(name, destRange, nextHopGateway, network)"

# For external IPv6 subnets, default route should exist automatically
# If missing, check that subnet is ipv6-access-type=EXTERNAL

gcloud compute networks subnets describe subnet-web \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="get(ipv6AccessType)"

# If INTERNAL, that IPv6 range is only routable inside VPC networks
# Fix: use a subnet with ipv6-access-type=EXTERNAL for native IPv6 internet access
```

## Fix: DNS Not Returning AAAA Records

```bash
# Problem: DNS resolves to IPv4 only, IPv6 clients fall back to IPv4
# Diagnosis:
dig AAAA example.com @8.8.8.8

# Fix: Add AAAA record in Cloud DNS
gcloud dns record-sets create example.com. \
    --zone=example-com-zone \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2600:1900:4000:abc1:8000::" \
    --project="$PROJECT"

# Verify
dig AAAA example.com
```

## Test Connectivity End-to-End

```bash
# From inside a VM, run comprehensive IPv6 test
gcloud compute ssh test-vm --zone="$ZONE" --project="$PROJECT"

# Then, on the VM:
# Test 1: Check address assignment
ip -6 addr show

# Test 2: Check routing
ip -6 route show

# Test 3: Ping Google DNS
ping6 -c 3 2001:4860:4860::8888

# Test 4: HTTP over IPv6
curl -6 -s https://ipv6.icanhazip.com

# Test 5: DNS AAAA resolution
dig AAAA google.com
```

## Conclusion

GCP IPv6 troubleshooting follows a layered approach: first verify the subnet has `stackType: IPV4_IPV6` and the expected `ipv6AccessType`, then confirm the VM's network interface has IPv6 enabled by checking `ipv6Address` for internal IPv6 or `ipv6AccessConfigs[0].externalIpv6` for external IPv6, check firewall rules allow ICMPv6 with protocol `58` and your desired ports with `::/0` source ranges where appropriate, verify the system-generated `::/0` route exists for external IPv6 subnets, and confirm DNS AAAA records are configured. Most issues resolve by updating the VM network interface stack type, correcting missing firewall rules, or using an external IPv6 subnet when you need native internet-routable IPv6.
