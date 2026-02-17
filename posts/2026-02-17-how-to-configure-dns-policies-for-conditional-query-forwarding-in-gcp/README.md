# How to Configure DNS Policies for Conditional Query Forwarding in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Forwarding, DNS Policies, Networking

Description: Learn how to configure DNS policies in Google Cloud DNS for conditional query forwarding to on-premises or third-party DNS servers in GCP.

---

When you connect your GCP environment to an on-premises network or another cloud provider, DNS resolution usually needs to work across both environments. Your VMs in GCP need to resolve names that are hosted on your corporate DNS servers, and sometimes your on-premises machines need to resolve GCP private DNS names. DNS policies with conditional forwarding solve this problem.

This guide covers how to set up DNS forwarding policies in Cloud DNS so that specific DNS queries get forwarded to the right DNS servers based on the domain name.

## How Conditional Forwarding Works

In Cloud DNS, conditional forwarding is implemented through forwarding zones. A forwarding zone matches a DNS name (like `corp.example.com`) and forwards all queries under that name to one or more target DNS servers instead of resolving them through Google's public DNS or your private zones.

The resolution order in Cloud DNS is:

1. Response policies (highest priority)
2. Private zones
3. Forwarding zones
4. Peering zones
5. Google public DNS (default)

So forwarding zones kick in when there is no matching private zone or response policy rule.

## Prerequisites

- A GCP project with Cloud DNS API enabled
- A VPC network connected to your on-premises network (via Cloud VPN or Cloud Interconnect)
- The IP addresses of your on-premises DNS servers
- Network connectivity from GCP to those DNS servers (the on-premises DNS servers must be reachable from your VPC)

## Step 1: Create a Forwarding Zone

Let's say your corporate DNS server at `10.1.0.2` hosts records for `corp.example.com`, and you want GCP VMs to be able to resolve those names.

```bash
# Create a forwarding zone that sends corp.example.com queries to on-prem DNS
gcloud dns managed-zones create corp-forwarding \
    --dns-name=corp.example.com. \
    --description="Forward corp.example.com queries to on-prem DNS" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="10.1.0.2,10.1.0.3" \
    --project=my-project
```

The `--forwarding-targets` parameter accepts a comma-separated list of IP addresses. You should always specify at least two DNS servers for redundancy.

## Step 2: Configure Private Forwarding vs. Standard Forwarding

Cloud DNS supports two forwarding modes. The difference matters when your target DNS server is on a private network.

**Standard forwarding** routes the query through Google's public network. This works when the target DNS server has a public IP.

**Private forwarding** routes the query through your VPC network. This is what you need for on-premises DNS servers that are only reachable over VPN or Interconnect.

```bash
# Create a forwarding zone with private routing (for on-prem servers)
gcloud dns managed-zones create corp-forwarding \
    --dns-name=corp.example.com. \
    --description="Forward to on-prem DNS via private routing" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="10.1.0.2[private],10.1.0.3[private]" \
    --project=my-project
```

Adding `[private]` after the IP address tells Cloud DNS to route the forwarded query through the VPC network instead of the public internet.

## Step 3: Set Up DNS Server Policies for Inbound Forwarding

If your on-premises DNS servers need to resolve GCP private DNS names (the reverse direction), you need to enable inbound DNS forwarding. This creates internal IP addresses in your VPC that on-premises servers can use as forwarders.

```bash
# Create a DNS server policy with inbound forwarding enabled
gcloud dns policies create inbound-forwarding \
    --description="Allow inbound DNS forwarding from on-prem" \
    --networks=my-vpc \
    --enable-inbound-forwarding \
    --project=my-project
```

After creating this policy, Cloud DNS allocates an IP address in each subnet that has the policy applied. You can find these addresses by listing the policy.

```bash
# Find the inbound forwarding IP addresses
gcloud compute addresses list \
    --filter="purpose=DNS_RESOLVER" \
    --project=my-project
```

These IP addresses (e.g., `10.128.0.2`) are what your on-premises DNS servers should use as conditional forwarders for GCP-hosted DNS names.

## Step 4: Configure Alternative Name Servers

DNS server policies also let you override the default DNS behavior for an entire VPC network. Instead of using Google's metadata server (169.254.169.254), you can direct all DNS queries to alternative name servers.

```bash
# Create a policy that uses custom name servers for all queries
gcloud dns policies create custom-dns-policy \
    --description="Use custom DNS servers for all queries" \
    --networks=my-vpc \
    --alternative-name-servers="10.1.0.2[private],10.1.0.3[private]" \
    --project=my-project
```

Be careful with this. When you set alternative name servers, all DNS queries from VMs in the VPC go to those servers first. If the alternative servers are down, DNS resolution fails entirely. Forwarding zones are generally a safer choice since they only affect specific domain names.

## Step 5: Combine Multiple Forwarding Zones

In practice, you often need forwarding rules for several domains. Each domain gets its own forwarding zone.

```bash
# Forward corporate domains to on-prem DNS
gcloud dns managed-zones create corp-forward \
    --dns-name=corp.example.com. \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="10.1.0.2[private],10.1.0.3[private]" \
    --project=my-project

# Forward partner domains to a partner DNS server
gcloud dns managed-zones create partner-forward \
    --dns-name=partner.example.net. \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="10.2.0.5[private]" \
    --project=my-project

# Forward reverse DNS for on-prem IP ranges
gcloud dns managed-zones create reverse-forward \
    --dns-name=1.10.in-addr.arpa. \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="10.1.0.2[private]" \
    --project=my-project
```

The reverse DNS forwarding zone is often overlooked but is important if you need reverse lookups for on-premises IPs from GCP.

## Terraform Configuration

Here is the full setup in Terraform.

```hcl
# Forwarding zone for corporate DNS
resource "google_dns_managed_zone" "corp_forwarding" {
  name        = "corp-forwarding"
  dns_name    = "corp.example.com."
  description = "Forward to on-prem DNS"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.my_vpc.id
    }
  }

  forwarding_config {
    target_name_servers {
      ipv4_address    = "10.1.0.2"
      forwarding_path = "private"
    }
    target_name_servers {
      ipv4_address    = "10.1.0.3"
      forwarding_path = "private"
    }
  }
}

# DNS server policy for inbound forwarding
resource "google_dns_policy" "inbound" {
  name                      = "inbound-forwarding"
  description               = "Allow inbound DNS forwarding from on-prem"
  enable_inbound_forwarding = true

  networks {
    network_url = google_compute_network.my_vpc.id
  }
}
```

## Testing the Configuration

Verify that forwarding is working by testing from a VM in your VPC.

```bash
# Test resolution of an on-prem domain from a GCP VM
dig corp-server.corp.example.com @169.254.169.254

# The query should be forwarded to 10.1.0.2 and return the correct IP

# Test that non-forwarded queries still work through Google's DNS
dig google.com @169.254.169.254
```

For testing inbound forwarding, configure your on-premises DNS server to forward GCP domains to the inbound forwarding IP address, then test resolution from an on-premises machine.

```bash
# From an on-prem machine, test resolution via the inbound forwarder
dig my-vm.internal.example.com @10.128.0.2
```

## Troubleshooting

**Forwarded queries time out**: Check that the target DNS servers are reachable from your VPC. If they are on-premises, verify your VPN or Interconnect connection. Make sure you are using `[private]` forwarding mode for private IPs.

**Incorrect responses**: Verify there is not a private zone in your VPC that matches the same DNS name. Private zones take precedence over forwarding zones.

**Inbound forwarding not working**: Confirm the DNS server policy has `--enable-inbound-forwarding` set. Check that the inbound IP addresses are reachable from your on-premises network. Firewall rules must allow UDP and TCP port 53 from on-premises to the inbound forwarding IPs.

**Partial resolution**: If some forwarded queries work but others do not, the issue might be on the target DNS server side. Check that the target server is authoritative for all the names you expect it to resolve.

## Wrapping Up

Conditional DNS forwarding is a critical piece of hybrid cloud networking. By combining forwarding zones for outbound resolution with inbound forwarding policies for the reverse direction, you get seamless name resolution between GCP and your on-premises environment. The setup is relatively simple once you understand the building blocks, but getting the forwarding mode right (private vs. standard) and ensuring network connectivity to the target DNS servers are the two things that trip people up most often.
