# How to Fix Cloud Router Learned Routes Exceeding Quota and BGP Route Advertisement Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Router, BGP, Networking, VPN

Description: Fix Cloud Router issues when learned routes exceed quota limits and BGP route advertisements are not working correctly in Google Cloud.

---

Cloud Router is the backbone of hybrid connectivity in Google Cloud. It uses BGP (Border Gateway Protocol) to dynamically exchange routes between your VPC network and on-premises networks through Cloud VPN or Cloud Interconnect. When your on-premises network advertises too many routes, or when route advertisements are misconfigured, you hit quota limits and networking breaks in confusing ways. This post covers how to diagnose and fix these issues.

## Understanding Cloud Router Route Limits

Every Cloud Router has limits on the number of routes it can learn from BGP peers and the number of routes it can advertise. The key limits are:

- Learned routes per Cloud Router: 250 (default), can be increased to 1,000 with a quota request
- Advertised routes per BGP session: No hard limit, but best practice is to keep it reasonable
- Maximum unique destinations per VPC: 400 dynamic routes per region (can be increased)

When you exceed these limits, the Cloud Router starts dropping routes, and some of your on-premises destinations become unreachable from GCP, or vice versa.

## Step 1: Check Current Route Count

First, see how many routes your Cloud Router is learning:

```bash
# Get the status of the Cloud Router including learned routes
gcloud compute routers get-status your-router \
    --region=us-central1 \
    --format="json(result.bgpPeerStatus)"
```

This shows each BGP peer and the number of learned routes. Look at the `numLearnedRoutes` field for each peer.

To see the actual routes:

```bash
# List all dynamic routes in the VPC
gcloud compute routes list \
    --filter="routeType:BGP" \
    --format="table(destRange, nextHopIp, priority, routeType)"
```

## Step 2: Check for Route Quota Exhaustion

If routes are being dropped, check the Cloud Router logs for warnings:

```bash
# Check Cloud Router logs for route limit warnings
gcloud logging read 'resource.type="gce_router" AND severity>=WARNING' \
    --project=your-project \
    --limit=20 \
    --format="table(timestamp, jsonPayload.message)"
```

Look for messages like:
- "Exceeded maximum number of learned routes"
- "Route limit reached, some routes were dropped"

You can also check the quota usage:

```bash
# Check routing quotas
gcloud compute project-info describe \
    --format="json(quotas)" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for q in data.get('quotas', []):
    if 'route' in q.get('metric', '').lower():
        print(f\"{q['metric']}: {q['usage']}/{q['limit']}\")
"
```

## Step 3: Request a Quota Increase

If you legitimately need more routes, request a quota increase:

```bash
# Check current learned route limit for the router
gcloud compute routers describe your-router \
    --region=us-central1 \
    --format="json(bgp)"
```

You can increase the learned route limit through the Google Cloud Console under IAM and Admin > Quotas, or by contacting Google Cloud support. The maximum is typically 1,000 learned routes per Cloud Router.

## Step 4: Summarize Routes on the On-Premises Side

The better long-term fix is to reduce the number of routes being advertised. Instead of advertising every individual /24 subnet from your on-premises network, summarize them into larger CIDR blocks.

For example, if your on-premises network advertises:
- 10.1.1.0/24
- 10.1.2.0/24
- 10.1.3.0/24
- 10.1.4.0/24

You can summarize these into a single route: 10.1.0.0/22

This requires configuration on your on-premises router. The specific commands depend on your router vendor (Cisco, Juniper, etc.), but the concept is route aggregation or summarization.

## Step 5: Use Custom Route Advertisements

Instead of advertising all subnets from your VPC, you can configure Cloud Router to advertise only specific routes. This reduces the number of routes your on-premises network needs to handle and gives you more control.

```bash
# Configure custom route advertisements on Cloud Router
gcloud compute routers update your-router \
    --region=us-central1 \
    --advertisement-mode=CUSTOM \
    --set-advertisement-groups=ALL_SUBNETS \
    --set-advertisement-ranges=10.0.0.0/8=on-prem-summary,172.16.0.0/12=other-summary
```

Or configure advertisements per BGP peer:

```bash
# Set custom advertisements on a specific BGP peer
gcloud compute routers update-bgp-peer your-router \
    --peer-name=your-bgp-peer \
    --region=us-central1 \
    --advertisement-mode=CUSTOM \
    --set-advertisement-groups=ALL_SUBNETS \
    --set-advertisement-ranges=10.128.0.0/16=gcp-primary
```

The `advertisement-mode=CUSTOM` setting lets you control exactly which routes are advertised. `ALL_SUBNETS` includes all VPC subnets, and `set-advertisement-ranges` lets you add custom ranges.

## Step 6: Filter Learned Routes

If your on-premises network advertises routes you do not need in GCP, you can filter them. Unfortunately, Cloud Router does not support inbound route filtering directly. You need to filter on the on-premises side by configuring route policies that limit what gets advertised to GCP.

On a Cisco router, this might look like:

```
! Example Cisco configuration to filter routes advertised to GCP
route-map TO-GCP permit 10
  match ip address prefix-list GCP-ROUTES
!
ip prefix-list GCP-ROUTES seq 10 permit 10.0.0.0/8 le 16
ip prefix-list GCP-ROUTES seq 20 deny 0.0.0.0/0 le 32
```

This only advertises routes within 10.0.0.0/8 with a prefix length of /16 or shorter.

## Step 7: Use Multiple Cloud Routers

If you have a large network with many routes, consider spreading the load across multiple Cloud Routers. Each Cloud Router has its own route limit, so using multiple routers effectively multiplies your capacity.

```bash
# Create additional Cloud Routers in different regions
gcloud compute routers create router-us-east \
    --region=us-east1 \
    --network=your-vpc \
    --asn=65001

gcloud compute routers create router-europe \
    --region=europe-west1 \
    --network=your-vpc \
    --asn=65001
```

Then distribute your VPN tunnels or Interconnect attachments across these routers. Each tunnel or attachment connects to one Cloud Router.

## Step 8: Check BGP Session Health

If routes are not being advertised or learned at all, the BGP session itself might be down:

```bash
# Check BGP peer status
gcloud compute routers get-status your-router \
    --region=us-central1 \
    --format="json(result.bgpPeerStatus[].name, result.bgpPeerStatus[].status, result.bgpPeerStatus[].state, result.bgpPeerStatus[].uptimeSeconds)"
```

The `status` should be `UP` and the `state` should be `ESTABLISHED`. If the state is `CONNECT` or `ACTIVE`, the BGP session is trying to establish but failing. Common causes:

- ASN mismatch between Cloud Router and on-premises router
- Incorrect BGP peer IP addresses
- Firewall blocking BGP (TCP port 179) between the tunnel endpoints
- MD5 authentication key mismatch

## Step 9: Verify Route Propagation

After fixing route issues, verify that routes are propagating correctly:

```bash
# Check routes learned from a specific peer
gcloud compute routers get-status your-router \
    --region=us-central1 \
    --format="json(result.bgpPeerStatus[0].advertisedRoutes)"

# Verify the routes appear in the VPC routing table
gcloud compute routes list \
    --filter="network:your-vpc AND routeType:BGP" \
    --format="table(destRange, nextHopIp, priority)"
```

## Monitoring Route Health

Route issues can cause intermittent connectivity problems that are hard to diagnose after the fact. Set up monitoring with [OneUptime](https://oneuptime.com) to track BGP session health, route counts, and connectivity between your GCP and on-premises networks. Getting alerted when a BGP session flaps or route counts change significantly helps you respond before users notice problems.

The main takeaway is that route quotas are real limits that you need to plan around. Summarize routes where possible, use custom advertisements to control what gets shared, and monitor route counts proactively.
