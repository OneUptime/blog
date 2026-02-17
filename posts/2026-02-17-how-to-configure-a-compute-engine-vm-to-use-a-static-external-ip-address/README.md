# How to Configure a Compute Engine VM to Use a Static External IP Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Static IP, Networking, Cloud Infrastructure

Description: Step-by-step instructions for reserving a static external IP address on Google Cloud and assigning it to a Compute Engine VM, including best practices for IP management and cost optimization.

---

Ephemeral IPs are fine for temporary workloads, but the moment you need DNS records, firewall whitelist entries, or third-party service registrations, you need a static IP. On Google Compute Engine, static external IPs are reserved IP addresses that persist independently of your VMs. You can assign them, unassign them, and reassign them without losing the address.

Here is how to set one up, along with the gotchas I have run into along the way.

## Understanding Ephemeral vs Static IPs

When you create a Compute Engine VM without specifying an IP, it gets an ephemeral external IP. This IP is released when the instance is stopped or deleted, and a new one is assigned when it starts again. Your DNS records, API integrations, and firewall rules all break.

A static external IP is reserved for your project until you explicitly release it. It stays the same regardless of what happens to the VM it is attached to.

## Step 1: Reserve a Static External IP

First, reserve an IP address in the region where your VM will run:

```bash
# Reserve a static external IP address in the us-central1 region
gcloud compute addresses create my-static-ip \
  --region=us-central1 \
  --network-tier=PREMIUM
```

The `--network-tier` flag has two options:
- `PREMIUM` (default) - uses Google's global network for better performance and latency
- `STANDARD` - uses the public internet for routing, which is cheaper but slower

Check the reserved IP address:

```bash
# Display the reserved IP address
gcloud compute addresses describe my-static-ip \
  --region=us-central1 \
  --format="value(address)"
```

This will output something like `34.123.45.67`. Write this down - you will need it for DNS configuration.

## Step 2: Assign the Static IP to a New VM

When creating a new instance, specify the reserved IP using the `--address` flag:

```bash
# Create a new VM with the reserved static IP address
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --address=my-static-ip \
  --tags=http-server,https-server
```

You can use either the name of the reserved address (`my-static-ip`) or the actual IP address (`34.123.45.67`).

## Assigning a Static IP to an Existing VM

If your VM already exists and has an ephemeral IP, the process requires a few steps. You need to remove the existing access config and add a new one with the static IP.

First, check the current access config name:

```bash
# Check the current network access configuration of the VM
gcloud compute instances describe web-server \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].name)"
```

This typically returns `External NAT`. Now delete the existing access config:

```bash
# Remove the current ephemeral IP from the VM
gcloud compute instances delete-access-config web-server \
  --zone=us-central1-a \
  --access-config-name="External NAT"
```

Then add a new access config with the static IP:

```bash
# Assign the static IP to the VM
gcloud compute instances add-access-config web-server \
  --zone=us-central1-a \
  --access-config-name="External NAT" \
  --address=34.123.45.67
```

Note that removing and adding the access config causes a brief network interruption. Plan accordingly if the VM is serving live traffic.

## Promoting an Ephemeral IP to Static

If your VM already has an ephemeral IP that you want to keep (maybe DNS is already pointing to it), you can promote it to static:

```bash
# First, find the current ephemeral IP
CURRENT_IP=$(gcloud compute instances describe web-server \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "Current IP: ${CURRENT_IP}"

# Promote the ephemeral IP to a static reservation
gcloud compute addresses create web-server-ip \
  --addresses="${CURRENT_IP}" \
  --region=us-central1
```

After promotion, the IP stays the same but is now reserved and will not change even if the VM is stopped or deleted.

## Managing Static IPs

List all reserved static IPs in your project:

```bash
# List all reserved static IP addresses with their status
gcloud compute addresses list \
  --format="table(name, address, status, region, users)"
```

The `status` column shows whether the IP is `IN_USE` (attached to a resource) or `RESERVED` (not attached). The `users` column shows which resource is using it.

## Handling the Cost Implications

Here is something that catches a lot of people off guard: static IPs that are reserved but not attached to a running VM are billed at a higher rate than IPs that are in use. Google charges for idle static IPs to discourage hoarding.

As of this writing, an unused static IP costs about $7.20 per month. An IP attached to a running VM has no additional charge beyond normal networking costs.

To find unused static IPs that are costing you money:

```bash
# Find all static IPs that are reserved but not in use
gcloud compute addresses list \
  --filter="status=RESERVED" \
  --format="table(name, address, region, creationTimestamp)"
```

Release any you no longer need:

```bash
# Release an unused static IP to stop billing
gcloud compute addresses delete old-unused-ip \
  --region=us-central1 \
  --quiet
```

## Setting Up DNS with Your Static IP

Once you have a static IP, you can configure DNS records. If you are using Cloud DNS:

```bash
# Create a DNS A record pointing to the static IP
gcloud dns record-sets create www.example.com \
  --zone=my-dns-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="34.123.45.67"
```

With a static IP, you can set a longer TTL since the IP will not change. A TTL of 3600 (1 hour) or even 86400 (24 hours) is fine for static IPs, which reduces DNS lookup overhead.

## Scripting Static IP Assignment

For automated deployments, here is a complete script that handles reservation and assignment:

```bash
#!/bin/bash
# Reserve a static IP and create a VM with it

PROJECT_ID="my-project"
REGION="us-central1"
ZONE="${REGION}-a"
IP_NAME="app-server-ip"
INSTANCE_NAME="app-server"

# Reserve a static IP if it does not already exist
if ! gcloud compute addresses describe "${IP_NAME}" --region="${REGION}" &>/dev/null; then
  echo "Reserving static IP: ${IP_NAME}"
  gcloud compute addresses create "${IP_NAME}" \
    --region="${REGION}" \
    --network-tier=PREMIUM
fi

# Get the reserved IP address
STATIC_IP=$(gcloud compute addresses describe "${IP_NAME}" \
  --region="${REGION}" \
  --format="value(address)")

echo "Using static IP: ${STATIC_IP}"

# Create the VM with the static IP
gcloud compute instances create "${INSTANCE_NAME}" \
  --zone="${ZONE}" \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --address="${IP_NAME}" \
  --tags=http-server,https-server

echo "Instance ${INSTANCE_NAME} created with static IP ${STATIC_IP}"
```

## Global vs Regional Static IPs

There are two types of static external IPs:

- **Regional** - used for individual VM instances, VPN gateways, and regional load balancers
- **Global** - used only for global load balancers (HTTP(S), SSL proxy, TCP proxy)

You cannot assign a global static IP directly to a VM. If you try, you will get an error. Always use regional IPs for Compute Engine instances:

```bash
# This is for VMs - reserve a REGIONAL static IP
gcloud compute addresses create vm-ip --region=us-central1

# This is for global load balancers only - NOT for VMs
gcloud compute addresses create lb-ip --global
```

## What Happens When You Stop a VM

When you stop a VM that has a static IP, the IP stays reserved to your project but is detached from the VM. When you start the VM again, the static IP is automatically reattached. You do not need to do anything manually.

However, if you delete the VM, the IP becomes unattached (status changes to RESERVED) and you are billed for it. You will need to either attach it to a new VM or release it.

Static external IPs are one of those fundamental networking building blocks that every production deployment needs. They take five minutes to set up and save you from the headache of chasing ephemeral IPs across restarts and redeployments.
