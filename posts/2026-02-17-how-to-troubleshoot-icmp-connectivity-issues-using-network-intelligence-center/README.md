# How to Troubleshoot ICMP Connectivity Issues Using Network Intelligence Center

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, ICMP, Network Intelligence Center, Connectivity Tests, Google Cloud Networking

Description: Learn how to diagnose and fix ICMP connectivity problems between GCP resources using Network Intelligence Center connectivity tests and firewall analysis.

---

You SSH into a VM, try to ping another instance, and nothing comes back. ICMP connectivity issues are one of the most common networking problems in GCP, and they are also one of the most frequently misunderstood. Unlike TCP or UDP, ICMP traffic is blocked by default in GCP, which catches many people off guard when they first start working with the platform.

In this post, I will walk through diagnosing ICMP issues using Network Intelligence Center, from running connectivity tests to identifying the specific firewall rules or routes that are blocking your ping.

## Why ICMP Fails by Default in GCP

GCP's default VPC comes with an implied deny-all ingress firewall rule. While some default rules are created that allow SSH (port 22) and RDP (port 3389), ICMP is not always included. If you deleted the `default-allow-icmp` rule or are working in a custom VPC, ICMP traffic will be blocked.

The first step is to check whether the basic ICMP firewall rule exists:

```bash
# Check if any firewall rules allow ICMP in your network
gcloud compute firewall-rules list \
  --filter="network=my-vpc AND allowed[].IPProtocol=icmp" \
  --format="table(name,direction,priority,sourceRanges.list(),allowed[].map().firewall_rule().list())" \
  --project=my-project
```

If this returns nothing, that is your answer - no firewall rule allows ICMP.

## Running an ICMP Connectivity Test

Network Intelligence Center's connectivity tests can analyze ICMP paths just like they do for TCP and UDP. This gives you a detailed trace of the packet's path through your network configuration.

```bash
# Create an ICMP connectivity test between two VMs
gcloud network-management connectivity-tests create icmp-test-web-to-db \
  --source-instance=projects/my-project/zones/us-central1-a/instances/web-server \
  --source-network=projects/my-project/global/networks/my-vpc \
  --destination-instance=projects/my-project/zones/us-central1-b/instances/db-server \
  --protocol=ICMP \
  --project=my-project
```

Note that for ICMP tests, you do not specify a port since ICMP does not use ports.

Check the results:

```bash
# Get the ICMP connectivity test results
gcloud network-management connectivity-tests describe icmp-test-web-to-db \
  --project=my-project \
  --format=yaml
```

## Interpreting Common ICMP Test Results

### Blocked by Ingress Firewall

The most common result you will see for failed ICMP tests:

```yaml
reachabilityDetails:
  result: UNREACHABLE
  traces:
    - steps:
        - state: START_FROM_INSTANCE
          instance:
            uri: projects/my-project/zones/us-central1-a/instances/web-server
        - state: APPLY_EGRESS_FIREWALL_RULE
          firewall:
            action: ALLOW
            uri: projects/my-project/global/firewalls/allow-all-egress
        - state: APPLY_INGRESS_FIREWALL_RULE
          firewall:
            action: DENY
            uri: projects/my-project/global/firewalls/implied-deny-ingress
          causesDrop: true
```

This tells you that egress from the source is fine, but ingress at the destination is blocked by the implied deny rule. The fix is straightforward:

```bash
# Create a firewall rule to allow ICMP traffic within the VPC
gcloud compute firewall-rules create allow-icmp-internal \
  --network=my-vpc \
  --allow=icmp \
  --source-ranges=10.128.0.0/9 \
  --direction=INGRESS \
  --priority=1000 \
  --description="Allow ICMP traffic between internal VMs" \
  --project=my-project
```

### Blocked by Route Issue

Sometimes the ICMP traffic is allowed by firewalls but there is no route to the destination:

```yaml
- state: APPLY_ROUTE
  route:
    routeType: SUBNET
  causesDrop: true
  dropCause: NO_ROUTE_FOUND
```

This typically happens when VMs are in different VPCs without peering, or when custom routes have been misconfigured.

### Blocked by VPC Peering

If VMs are in peered VPCs, ICMP might fail if the peering is not exchanging custom routes or if firewall rules do not account for the peered network's IP range:

```bash
# Check VPC peering configuration
gcloud compute networks peerings list \
  --network=my-vpc \
  --project=my-project \
  --format="table(name,network,state,exportCustomRoutes,importCustomRoutes)"
```

## Debugging ICMP to External Addresses

Pinging external addresses (like 8.8.8.8) from a VM that has no external IP requires Cloud NAT. Without it, the response packets have no way to get back to your VM.

```bash
# Test ICMP connectivity from a VM to an external IP
gcloud network-management connectivity-tests create icmp-external-test \
  --source-instance=projects/my-project/zones/us-central1-a/instances/internal-vm \
  --source-network=projects/my-project/global/networks/my-vpc \
  --destination-ip-address=8.8.8.8 \
  --protocol=ICMP \
  --project=my-project
```

If the test shows the traffic is being dropped at the external gateway, check your Cloud NAT configuration:

```bash
# List Cloud NAT configurations for your network
gcloud compute routers list \
  --filter="network=my-vpc" \
  --project=my-project \
  --format="table(name,region,nats[].name)"

# Check NAT details
gcloud compute routers nats describe my-nat \
  --router=my-router \
  --region=us-central1 \
  --project=my-project
```

## ICMP Between GCP and On-Premises

ICMP issues are particularly common with hybrid connectivity. If you have a Cloud VPN or Cloud Interconnect, there are multiple places where ICMP can be blocked:

1. The GCP-side firewall rules
2. The VPN tunnel configuration
3. The on-premises firewall
4. The on-premises router ACLs

For the GCP side, run a connectivity test:

```bash
# Test ICMP to an on-premises IP through VPN
gcloud network-management connectivity-tests create icmp-to-onprem \
  --source-instance=projects/my-project/zones/us-central1-a/instances/app-server \
  --source-network=projects/my-project/global/networks/my-vpc \
  --destination-ip-address=192.168.1.100 \
  --protocol=ICMP \
  --project=my-project
```

If the GCP-side analysis shows the traffic is reaching the VPN tunnel, the problem is likely on the on-premises side. Check your on-premises firewall for ICMP allow rules and verify the return route exists.

## Using Packet Mirroring for Deep Analysis

If connectivity tests show the path should work but ping still fails, you might need to look at actual packet data. Packet Mirroring lets you capture traffic for analysis:

```bash
# Create a packet mirroring policy for ICMP traffic analysis
gcloud compute packet-mirrorings create icmp-debug-mirror \
  --network=my-vpc \
  --region=us-central1 \
  --mirrored-instances=projects/my-project/zones/us-central1-a/instances/web-server \
  --collector-ilb=projects/my-project/regions/us-central1/forwardingRules/mirror-collector \
  --filter-protocols=icmp \
  --project=my-project
```

The mirrored traffic goes to a collector where you can run tcpdump or Wireshark to see exactly what is happening at the packet level.

## Common Pitfalls

There are several things that frequently cause confusion with ICMP in GCP.

The implied deny rule does not show up in `gcloud compute firewall-rules list`. It is always there but invisible. Connectivity tests will reference it as `implied-deny-ingress`.

Network tags matter. If your allow-icmp rule targets specific tags, make sure the destination VM has those tags applied.

ICMP type filtering is supported. You can create rules that allow only specific ICMP types (like echo request/reply) rather than all ICMP traffic:

```bash
# Allow only ping (echo request and echo reply) between tagged instances
gcloud compute firewall-rules create allow-ping-only \
  --network=my-vpc \
  --allow=icmp \
  --source-tags=allow-ping \
  --target-tags=allow-ping \
  --direction=INGRESS \
  --project=my-project
```

GCP does not support ICMP redirect messages. If your application depends on ICMP redirects for path optimization, it will not work in GCP.

## Summary

ICMP troubleshooting in GCP comes down to three things: checking firewall rules (since ICMP is denied by default), verifying routes exist between source and destination, and confirming NAT is configured for instances without external IPs. Network Intelligence Center connectivity tests let you diagnose all of these with a single command, showing you exactly where in the path the traffic is being dropped. Start with the connectivity test, read the trace, and fix the specific component that is blocking traffic.
