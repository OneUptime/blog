# How to Configure DNS Forwarding Zones to Resolve On-Premises Hostnames from GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Forwarding, On-Premise, Hybrid Cloud

Description: Learn how to set up DNS forwarding zones in Google Cloud DNS to resolve on-premises hostnames from GCP VMs through VPN or Interconnect connectivity.

---

In hybrid cloud environments, your GCP workloads often need to resolve hostnames that live in your on-premises DNS infrastructure. Maybe you have an internal Active Directory domain, legacy applications with on-premises hostnames, or databases that are only discoverable through your corporate DNS servers. DNS forwarding zones in Cloud DNS let you forward specific DNS queries from GCP to your on-premises DNS servers, so VMs in GCP can resolve those internal hostnames seamlessly.

This post covers the complete setup, from prerequisites to testing and troubleshooting.

## How DNS Forwarding Zones Work

A DNS forwarding zone tells Cloud DNS: "For queries matching this domain, do not try to answer locally. Instead, forward the query to these specific DNS servers."

When a VM in your VPC makes a DNS query for `server.corp.internal`, and you have a forwarding zone for `corp.internal` pointing to your on-premises DNS server at `192.168.1.10`, the flow looks like this:

```mermaid
sequenceDiagram
    participant VM as GCP VM
    participant CloudDNS as Cloud DNS
    participant VPN as VPN/Interconnect
    participant OnPremDNS as On-Premises DNS

    VM->>CloudDNS: Query: server.corp.internal?
    CloudDNS->>CloudDNS: Match forwarding zone for corp.internal
    CloudDNS->>VPN: Forward query to 192.168.1.10
    VPN->>OnPremDNS: DNS query arrives
    OnPremDNS->>VPN: Response: 192.168.1.100
    VPN->>CloudDNS: Response forwarded back
    CloudDNS->>VM: server.corp.internal = 192.168.1.100
```

## Prerequisites

Before setting up DNS forwarding, you need:

1. **Network connectivity**: A Cloud VPN or Cloud Interconnect connection between GCP and your on-premises network
2. **On-premises DNS servers**: The IP addresses of your DNS servers that can resolve the internal hostnames
3. **Firewall rules**: Both GCP and on-premises firewalls must allow DNS traffic (UDP and TCP port 53) from Cloud DNS to the on-premises DNS servers
4. **Routing**: GCP must have routes to reach the on-premises DNS server IPs

## Step 1: Verify Network Connectivity

Before configuring DNS forwarding, verify that GCP can reach your on-premises DNS servers:

```bash
# From a GCP VM, test connectivity to the on-premises DNS server

nc -zv 192.168.1.10 53

# Test DNS resolution directly against the on-premises server
dig @192.168.1.10 server.corp.internal
```

If these fail, fix your VPN/Interconnect connectivity and firewall rules first.

## Step 2: Create a DNS Forwarding Zone

Create a forwarding zone for the on-premises domain:

```bash
# Create a forwarding zone that sends queries to on-premises DNS
gcloud dns managed-zones create on-prem-forward \
    --dns-name="corp.internal." \
    --description="Forward DNS queries to on-premises DNS servers" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="192.168.1.10,192.168.1.11"
```

This creates a forwarding zone for `corp.internal` that sends queries to two on-premises DNS servers (for redundancy).

## Step 3: Configure Forwarding for Multiple Domains

If your on-premises environment has multiple DNS domains, create separate forwarding zones for each:

```bash
# Forward Active Directory domain
gcloud dns managed-zones create ad-forward \
    --dns-name="ad.company.com." \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="192.168.1.10,192.168.1.11"

# Forward legacy application domain
gcloud dns managed-zones create legacy-forward \
    --dns-name="legacy.internal." \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="192.168.1.10"

# Forward reverse DNS for on-premises IP ranges
gcloud dns managed-zones create reverse-forward \
    --dns-name="168.192.in-addr.arpa." \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="192.168.1.10"
```

## Step 4: Configure Private vs Standard Forwarding

Cloud DNS supports two forwarding modes:

**Standard forwarding** (default): Routes RFC 1918 targets through the authorized VPC network and non-RFC 1918 targets over the internet. For on-premises RFC 1918 targets reached through VPN or Interconnect, the source IP comes from `35.199.192.0/19`.

**Private forwarding**: Always routes the DNS query through the authorized VPC network, including for non-RFC 1918 privately used addresses. The source IP comes from a GCP-managed IP range (`35.199.192.0/19`).

For on-premises DNS servers reached through VPN/Interconnect, private forwarding is usually what you need:

```bash
# Create a forwarding zone with private forwarding
gcloud dns managed-zones create on-prem-private-forward \
    --dns-name="corp.internal." \
    --visibility=private \
    --networks=my-vpc \
    --private-forwarding-targets="192.168.1.10,192.168.1.11"
```

The `--private-forwarding-targets` flag enables private forwarding for those targets.

## Step 5: Configure Firewall Rules

### GCP Side

If your forwarding targets are DNS servers running on Compute Engine VMs or internal passthrough Network Load Balancers, allow DNS traffic from the Cloud DNS forwarding range:

```bash
# Allow DNS traffic from the 35.199.192.0/19 range to DNS servers in the VPC
gcloud compute firewall-rules create allow-cloud-dns-forwarding \
    --network=my-vpc \
    --action=allow \
    --direction=ingress \
    --source-ranges=35.199.192.0/19 \
    --rules=tcp:53,udp:53
```

For DNS servers that are only on-premises, the required packet filtering is usually on the on-premises side rather than in a VPC firewall rule.

### On-Premises Side

Configure your on-premises firewall to allow DNS queries from GCP. The source IP range depends on the forwarding mode:

- **Standard forwarding to RFC 1918 on-premises targets**: Source IPs are from `35.199.192.0/19`
- **Standard forwarding to internet-routable targets**: Source IPs are from Google Public DNS source ranges
- **Private forwarding**: Source IPs are from `35.199.192.0/19`

Add a firewall rule on your on-premises network allowing DNS traffic from `35.199.192.0/19` to your DNS servers.

## Step 6: Configure Routes

For Type 2 on-premises targets, your on-premises network must have a return route for `35.199.192.0/19` back through the same VPC network over VPN or Interconnect. With Cloud Router and BGP using custom advertisements, add the range to the advertisements sent to your on-premises router:

```bash
# Advertise the Cloud DNS forwarding range to on-premises over BGP
gcloud compute routers update my-router \
    --region=us-central1 \
    --add-advertisement-ranges=35.199.192.0/19
```

If the router is not already using custom advertisement mode, switch to custom mode and include `35.199.192.0/19` along with any existing advertised ranges. If you set custom advertisements at the BGP peer instead of the router, add the range to that BGP peer's advertisements. For static or policy-based VPNs, configure the equivalent route or traffic selector on the on-premises side.

## Step 7: Test DNS Resolution

From a GCP VM in the authorized VPC:

```bash
# Test resolution of on-premises hostnames
dig server.corp.internal +short

# Explicitly query the Compute Engine metadata server used by Cloud DNS
dig @169.254.169.254 server.corp.internal

# Test reverse resolution
dig -x 192.168.1.100

# Verify standard GCP resolution still works
dig www.google.com +short
```

## Advanced: Conditional Forwarding

You can create forwarding zones for very specific subdomains while handling the parent domain differently:

```bash
# Forward only the database subdomain to on-premises DNS
gcloud dns managed-zones create db-forward \
    --dns-name="db.corp.internal." \
    --visibility=private \
    --networks=my-vpc \
    --private-forwarding-targets="192.168.1.10"

# Create a private zone for the rest of corp.internal
gcloud dns managed-zones create corp-private \
    --dns-name="corp.internal." \
    --visibility=private \
    --networks=my-vpc
```

Cloud DNS uses the most specific matching zone. Queries for `db.corp.internal` go to the forwarding zone, while queries for other `corp.internal` names use the private zone.

## Forwarding to Multiple On-Premises Locations

If you have DNS servers in multiple on-premises locations:

```bash
# Forward to DNS servers in different data centers
gcloud dns managed-zones create multi-site-forward \
    --dns-name="global.internal." \
    --visibility=private \
    --networks=my-vpc \
    --private-forwarding-targets="192.168.1.10,10.0.1.10,172.16.1.10"
```

Cloud DNS ranks forwarding targets based on successful responses and latency. It queries the highest-ranked target first, then tries the next targets if that server does not respond.

## Forwarding to Cloud-Based DNS Services

Forwarding zones are not limited to on-premises servers. You can forward to any DNS server reachable from your VPC:

```bash
# Forward to a DNS server in another cloud provider (via VPN)
gcloud dns managed-zones create aws-forward \
    --dns-name="aws.company.com." \
    --visibility=private \
    --networks=my-vpc \
    --private-forwarding-targets="10.200.0.2"
```

## Monitoring and Logging

Enable DNS query logging to troubleshoot forwarding issues:

```bash
# Enable logging on the VPC's DNS policy
gcloud dns policies create logging-policy \
    --networks=my-vpc \
    --enable-logging
```

View the logs:

```bash
# View DNS query logs
gcloud logging read 'resource.type="dns_query"' \
    --limit=20 \
    --format="table(timestamp,jsonPayload.queryName,jsonPayload.responseCode,jsonPayload.destinationIP,jsonPayload.egressError)"
```

## Troubleshooting

**Queries timing out**: Check that firewall rules on both sides allow DNS traffic. For private forwarding, verify that `35.199.192.0/19` can reach your DNS servers.

**SERVFAIL responses**: Your on-premises DNS server is reachable but returning an error. Check the on-premises DNS server logs. It might be rejecting queries from unknown source IPs.

**Partial resolution**: Some names resolve but others do not. This could be a split DNS issue where the on-premises server only handles certain zones. Create forwarding zones for each specific domain.

**Slow resolution**: DNS forwarding adds latency (the VPN/Interconnect round trip). If this is a problem, consider running a caching DNS server in GCP or migrating frequently-used records to a Cloud DNS private zone.

```bash
# Check the response time from GCP to on-premises DNS
dig @192.168.1.10 server.corp.internal +stats | grep "Query time"
```

## Terraform Configuration

```hcl
# DNS forwarding zone
resource "google_dns_managed_zone" "on_prem_forward" {
  name        = "on-prem-forward"
  dns_name    = "corp.internal."
  description = "Forward to on-premises DNS"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }

  forwarding_config {
    target_name_servers {
      ipv4_address    = "192.168.1.10"
      forwarding_path = "private"
    }
    target_name_servers {
      ipv4_address    = "192.168.1.11"
      forwarding_path = "private"
    }
  }
}
```

## Wrapping Up

DNS forwarding zones are essential for hybrid cloud environments where GCP workloads need to resolve on-premises hostnames. The setup is straightforward: create a forwarding zone, point it at your on-premises DNS servers, ensure firewall rules allow DNS traffic, and verify connectivity. Use private forwarding mode for on-premises targets reached through VPN/Interconnect, and create separate forwarding zones for each domain you need to resolve. Combined with private DNS zones for GCP-native names, you get a complete DNS solution that bridges cloud and on-premises seamlessly.
