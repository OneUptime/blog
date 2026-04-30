# How to Use GCP Network Intelligence Center to Troubleshoot IPv4 Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Network Intelligence Center, Troubleshooting, IPv4, VPC, Connectivity

Description: Use GCP Network Intelligence Center's connectivity tests, network topology, and firewall insights to diagnose and resolve IPv4 connectivity issues in GCP VPCs.

## Introduction

GCP Network Intelligence Center is a suite of tools for monitoring, analyzing, and troubleshooting network configurations. It includes Connectivity Tests, Network Topology, Firewall Insights, and Performance Dashboard - providing visibility into why IPv4 traffic flows or fails.

## Tool Overview

| Tool | Purpose |
|------|---------|
| Connectivity Tests | Simulate and verify packet paths between endpoints |
| Network Topology | Visual map of network topology and observed communication |
| Firewall Insights | Identify shadowed, overly permissive, or unused firewall rules |
| Performance Dashboard | Packet loss and latency for VM-to-VM traffic, plus latency to internet locations |

## Connectivity Tests

Connectivity Tests simulate packet paths and tell you whether traffic between two endpoints is allowed or blocked - and why.

```bash
# Test TCP connectivity from a VM to an external IP

gcloud network-management connectivity-tests create vm-to-internet \
  --source-instance projects/my-project/zones/us-east1-b/instances/my-vm \
  --destination-ip-address 8.8.8.8 \
  --protocol TCP \
  --destination-port 443

# Test connectivity between two internal VMs
gcloud network-management connectivity-tests create internal-test \
  --source-instance projects/my-project/zones/us-east1-b/instances/vm-a \
  --destination-instance projects/my-project/zones/us-east1-c/instances/vm-b \
  --protocol TCP \
  --destination-port 8080
```

## Running and Retrieving Test Results

```bash
# Rerun an existing connectivity test
gcloud network-management connectivity-tests rerun vm-to-internet

# Get the test result
gcloud network-management connectivity-tests describe vm-to-internet \
  --format json | jq '.reachabilityDetails'
```

The result includes a `result` field (`REACHABLE`, `UNREACHABLE`, `AMBIGUOUS`, `UNDETERMINED`) and one or more traces showing the resources and rules that allowed or blocked the simulated packet.

## Firewall Insights

Identify shadowed, overly permissive, or unused rules:

```bash
# Enable the APIs used by Firewall Insights
gcloud services enable firewallinsights.googleapis.com
gcloud services enable recommender.googleapis.com

# List Firewall Insights for your project
gcloud recommender insights list \
  --project=my-project \
  --location=global \
  --insight-type=google.compute.firewall.Insight \
  --format=json
```

Log-based insights require Firewall Rules Logging, and shadowed or overly permissive rule insights must be enabled in Firewall Insights configuration before they appear.

Navigate to **Network Intelligence Center > Firewall Insights** in the console to see:
- Rules with no hits during the observation period
- Rules shadowed by higher-priority rules
- Overly broad source ranges (e.g., 0.0.0.0/0 on sensitive ports)

## Network Topology

View and analyze VPC topology in the console:

```bash
# Enable the Network Management API
gcloud services enable networkmanagement.googleapis.com
```

Navigate to **Network Intelligence Center > Network Topology** to see a visual graph of:
- VPC networks and subnets
- Observed communication between resources, including internet traffic
- Cloud Interconnect and VPN connections

## Diagnosing a Specific Connectivity Problem

A common workflow for debugging an unreachable VM:

```bash
# Step 1: Run a connectivity test
gcloud network-management connectivity-tests create debug-test \
  --source-ip-address 203.0.113.50 \
  --source-network-type non-gcp-network \
  --destination-ip-address 10.0.1.10 \
  --destination-network projects/my-project/global/networks/my-vpc \
  --protocol TCP \
  --destination-port 22

# Step 2: Check whether a route exists for the destination subnet
gcloud compute routes list --filter="network=my-vpc AND destRange=10.0.1.0/24"

# Step 3: Verify ingress firewall rules
gcloud compute firewall-rules list \
  --filter="network=my-vpc AND direction=INGRESS" \
  --format="table(name,sourceRanges,allowed,targetTags)"
```

## Performance Dashboard

Monitor packet loss and latency between GCP zones or regions, plus latency to internet locations:

```bash
# View performance dashboard
gcloud services enable networkmanagement.googleapis.com
# Then navigate to Network Intelligence Center > Performance Dashboard in console
```

## Conclusion

GCP Network Intelligence Center removes the guesswork from network troubleshooting. Connectivity Tests provide definitive answers about reachability, Firewall Insights surface security gaps, and Network Topology gives context for complex multi-VPC environments.
