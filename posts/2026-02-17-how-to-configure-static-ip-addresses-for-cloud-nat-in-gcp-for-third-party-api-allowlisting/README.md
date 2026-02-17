# How to Configure Static IP Addresses for Cloud NAT in GCP for Third-Party API Allowlisting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud NAT, Static IP, API Integration, Networking

Description: Set up Cloud NAT with static IP addresses so you can provide fixed outbound IPs to third-party services that require IP allowlisting for API access.

---

Many third-party APIs and SaaS providers require you to provide a list of IP addresses that will be calling their services. They add those IPs to an allowlist, and requests from any other IP get rejected. If your GCP workloads use Cloud NAT with auto-allocated IPs, you have a problem - those IPs can change at any time, breaking your API integrations. The solution is to configure Cloud NAT with static IP addresses that you control and that will not change.

This guide covers the full setup, from reserving static IPs to configuring Cloud NAT and handling scale considerations.

## The Problem with Auto-Allocated NAT IPs

When you create a Cloud NAT gateway with `--auto-allocate-nat-external-ips`, GCP assigns external IP addresses from its pool. These IPs can change when:

- GCP needs to rebalance IP allocation
- You update the NAT configuration
- The NAT gateway scales up and adds new IPs

For most use cases this is fine. But when a third-party requires IP allowlisting, changing IPs means downtime and manual coordination with the provider to update their allowlist.

## Step 1: Reserve Static External IP Addresses

Reserve the static IPs that will be used for NAT:

```bash
# Reserve static external IP addresses in the same region as your NAT
gcloud compute addresses create nat-static-ip-1 \
  --region=us-central1 \
  --project=your-project-id

gcloud compute addresses create nat-static-ip-2 \
  --region=us-central1 \
  --project=your-project-id
```

Verify the reserved IPs:

```bash
# List your reserved static IPs
gcloud compute addresses list \
  --filter="region:us-central1 AND name:nat-static" \
  --format="table(name, address, status)" \
  --project=your-project-id
```

Note the IP addresses that were assigned. These are the addresses you will share with third-party providers for their allowlists.

## Step 2: Create a Cloud Router

If you do not already have one:

```bash
# Create a Cloud Router in the same region
gcloud compute routers create nat-router \
  --network=your-vpc-network \
  --region=us-central1 \
  --project=your-project-id
```

## Step 3: Create Cloud NAT with Static IPs

Create the NAT gateway using your static IPs instead of auto-allocation:

```bash
# Create Cloud NAT with static IP pool
gcloud compute routers nats create static-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --nat-external-ip-pool=nat-static-ip-1,nat-static-ip-2 \
  --nat-all-subnet-ip-ranges \
  --project=your-project-id
```

The `--nat-external-ip-pool` flag takes a comma-separated list of your reserved IP address resource names.

## Step 4: Verify the Configuration

Check that the NAT gateway is using your static IPs:

```bash
# Describe the NAT gateway to confirm IP allocation
gcloud compute routers nats describe static-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --project=your-project-id \
  --format=yaml
```

Test from a VM to confirm the outbound IP:

```bash
# SSH into a VM and check the outbound IP
gcloud compute ssh your-private-vm \
  --zone=us-central1-a \
  --tunnel-through-iap \
  --project=your-project-id \
  --command="curl -s ifconfig.me"
```

The returned IP should be one of your static NAT IPs.

## Calculating How Many Static IPs You Need

Each static IP provides 64,512 ports for NAT (ports 1024-65535). Each outbound connection uses one port. The number of IPs you need depends on your concurrent outbound connection count.

Here is the math:

```
Required IPs = ceil(Max concurrent connections / 64512)
```

For most workloads, 2-4 static IPs are sufficient. But if you have hundreds of VMs all making many outbound connections, you might need more.

```bash
# Check current NAT port usage to inform your decision
gcloud logging read \
  'resource.type="nat_gateway" AND jsonPayload.allocation_status="DROPPED"' \
  --project=your-project-id \
  --limit=10
```

If you see dropped connections due to port exhaustion, add more static IPs.

## Managing Port Allocation

By default, Cloud NAT assigns a minimum of 64 ports per VM. You can adjust this:

```bash
# Increase minimum ports per VM for high-connection workloads
gcloud compute routers nats update static-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --min-ports-per-vm=256 \
  --project=your-project-id
```

Or enable dynamic port allocation to automatically assign more ports to VMs that need them:

```bash
# Enable dynamic port allocation
gcloud compute routers nats update static-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --enable-dynamic-port-allocation \
  --min-ports-per-vm=64 \
  --max-ports-per-vm=4096 \
  --project=your-project-id
```

Dynamic port allocation is particularly useful with static IPs because it maximizes the utilization of your fixed IP pool.

## Adding More Static IPs Later

If you need to add more IPs to an existing NAT gateway:

```bash
# Reserve a new static IP
gcloud compute addresses create nat-static-ip-3 \
  --region=us-central1 \
  --project=your-project-id

# Update the NAT gateway to include the new IP
gcloud compute routers nats update static-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --nat-external-ip-pool=nat-static-ip-1,nat-static-ip-2,nat-static-ip-3 \
  --project=your-project-id
```

Remember to update your third-party allowlists with the new IP address.

## Restricting NAT to Specific Subnets

You might not want all subnets to use the same static NAT IPs. For example, you might want API integration traffic to go through specific static IPs while general internet traffic uses auto-allocated IPs:

```bash
# Create a NAT gateway with static IPs only for the API subnet
gcloud compute routers nats create api-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --nat-external-ip-pool=nat-static-ip-1,nat-static-ip-2 \
  --nat-custom-subnet-ip-ranges=api-subnet \
  --project=your-project-id

# Create a separate NAT gateway with auto IPs for general internet access
gcloud compute routers nats create general-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --auto-allocate-nat-external-ips \
  --nat-custom-subnet-ip-ranges=general-subnet \
  --project=your-project-id
```

This keeps your static IP pool dedicated to API traffic, reducing the risk of port exhaustion from unrelated workloads.

## Monitoring Static NAT IP Usage

Set up monitoring to track how your static IPs are being utilized:

```bash
# Enable Cloud NAT logging
gcloud compute routers nats update static-nat-gateway \
  --router=nat-router \
  --region=us-central1 \
  --enable-logging \
  --log-filter=ALL \
  --project=your-project-id
```

Key metrics to track in Cloud Monitoring:

- **Port utilization per IP** - if any single IP is near capacity, add more
- **Dropped connections** - indicates port exhaustion
- **Active connections per VM** - identifies which VMs consume the most ports

```bash
# Check for port exhaustion events
gcloud logging read \
  'resource.type="nat_gateway" AND resource.labels.gateway_name="static-nat-gateway" AND jsonPayload.allocation_status="DROPPED"' \
  --project=your-project-id \
  --limit=20 \
  --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.connection.dest_ip)"
```

## What to Tell Third-Party Providers

When sharing your NAT IPs with third-party providers, give them:

1. The list of all static IP addresses (from all NAT gateways if you have multiple regions)
2. A heads-up that you might add new IPs in the future if you need to scale
3. Your expected request volume so they can plan their capacity

Also ask them:
- How long does it take to update their allowlist?
- Do they have an API for managing the allowlist programmatically?
- Is there a limit on the number of IPs they can allowlist?

## Handling Multi-Region Deployments

If your workloads span multiple regions, you need static NAT IPs in each region:

```bash
# Region 1 setup
gcloud compute addresses create nat-ip-us-1 --region=us-central1
gcloud compute routers nats create us-nat \
  --router=us-router \
  --region=us-central1 \
  --nat-external-ip-pool=nat-ip-us-1 \
  --nat-all-subnet-ip-ranges

# Region 2 setup
gcloud compute addresses create nat-ip-eu-1 --region=europe-west1
gcloud compute routers nats create eu-nat \
  --router=eu-router \
  --region=europe-west1 \
  --nat-external-ip-pool=nat-ip-eu-1 \
  --nat-all-subnet-ip-ranges
```

All these IPs need to be on the third-party allowlist.

## Wrapping Up

Static IP addresses on Cloud NAT solve the very practical problem of IP allowlisting with third-party services. The setup is simple - reserve IPs, assign them to your NAT gateway, and share them with your partners. The main thing to plan for is capacity: make sure you have enough IPs and ports for your outbound connection volume. Enable logging and monitoring from day one so you can catch port exhaustion before it affects your API integrations.
