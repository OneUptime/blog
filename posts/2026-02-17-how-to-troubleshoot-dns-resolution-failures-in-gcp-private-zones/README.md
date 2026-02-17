# How to Troubleshoot DNS Resolution Failures in GCP Private Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Troubleshooting, Private Zones, Networking

Description: A practical troubleshooting guide for diagnosing and fixing DNS resolution failures in Google Cloud DNS private zones across VPC networks.

---

DNS resolution failures in GCP private zones are one of the most frustrating issues to debug. Everything looks correct in the console, the records are there, and the zone is attached to the right network, but VMs still cannot resolve the names. I have seen this trip up teams repeatedly, so let me walk you through a systematic troubleshooting approach.

## Understanding Private Zone Resolution

Before diving into troubleshooting, let's understand how private zone resolution works in GCP. When a VM sends a DNS query to the internal metadata server at `169.254.169.254`, Cloud DNS checks the following in order:

1. Response policies attached to the VPC
2. Private zones attached to the VPC (longest suffix match wins)
3. Forwarding zones attached to the VPC
4. Peering zones attached to the VPC
5. Auto-generated internal zones (like `.internal` for Compute Engine)
6. Google public DNS

If a query matches a private zone but the zone does not have a record for that specific name, Cloud DNS returns NXDOMAIN. It does not fall through to public DNS. This "shadow" effect is a common source of confusion.

## Step 1: Verify the Zone Configuration

Start by confirming the zone exists and is configured correctly.

```bash
# List all private zones in the project
gcloud dns managed-zones list \
    --filter="visibility=private" \
    --project=my-project

# Describe the specific zone to check its configuration
gcloud dns managed-zones describe my-private-zone \
    --project=my-project
```

Check the output for these details:
- `visibility` should be `private`
- `privateVisibilityConfig.networks` should include the VPC network your VM is in
- `dnsName` should match the domain you are trying to resolve (with trailing dot)

## Step 2: Check That the Record Exists

This sounds obvious, but verify the actual record is there and spelled correctly.

```bash
# List all records in the private zone
gcloud dns record-sets list \
    --zone=my-private-zone \
    --project=my-project

# Look for a specific record
gcloud dns record-sets list \
    --zone=my-private-zone \
    --filter="name=myapp.internal.example.com. AND type=A" \
    --project=my-project
```

Common mistakes here include:
- Missing trailing dot on the record name
- Wrong record type (CNAME instead of A, or vice versa)
- Record is in the wrong zone
- Typos in the record name

## Step 3: Verify VM Network Attachment

The VM must be in a VPC network that is listed in the zone's network bindings.

```bash
# Check which network the VM is on
gcloud compute instances describe my-vm \
    --zone=us-central1-a \
    --format="value(networkInterfaces[0].network)" \
    --project=my-project

# Check which networks the zone is attached to
gcloud dns managed-zones describe my-private-zone \
    --format="value(privateVisibilityConfig.networks)" \
    --project=my-project
```

Make sure these match. A VM in `projects/my-project/global/networks/vpc-a` will not see records from a zone only attached to `projects/my-project/global/networks/vpc-b`.

## Step 4: Test DNS Resolution from the VM

SSH into the VM and run DNS queries to understand what is happening.

```bash
# Basic resolution test using the metadata server
dig myapp.internal.example.com @169.254.169.254

# Check what the response code is
dig +short myapp.internal.example.com @169.254.169.254

# Try with verbose output for full details
dig +noall +answer +authority myapp.internal.example.com @169.254.169.254
```

Look at the response carefully:

- **NOERROR with answer**: Resolution works. If your application still fails, the issue is not DNS.
- **NXDOMAIN**: The name was not found. Either the record does not exist in the zone, or the VM cannot see the zone.
- **SERVFAIL**: Cloud DNS had an internal error or could not reach a forwarding target.
- **REFUSED**: The query was explicitly rejected.
- **No response / timeout**: Network connectivity issue between the VM and the metadata server.

## Step 5: Check for Zone Shadowing

Zone shadowing is the most common "gotcha" with private zones. If you have a private zone for `example.com.`, it shadows all public DNS records under `example.com`. Any query for a name under `example.com` will only check the private zone and will NOT fall through to public DNS.

```bash
# If you have a private zone for example.com, this query will ONLY
# check the private zone - it will never reach public DNS
dig www.example.com @169.254.169.254

# This returns NXDOMAIN even though www.example.com exists in public DNS,
# because the private zone for example.com does not have a www record
```

To fix shadowing, either:
1. Add the missing records to the private zone
2. Narrow the private zone scope (e.g., use `internal.example.com` instead of `example.com`)
3. Create response policy rules with bypass behavior for specific names

## Step 6: Check Conflicting Zones

If multiple private zones could match a query, Cloud DNS uses the longest suffix match. For example, if you have zones for both `example.com` and `internal.example.com`, a query for `app.internal.example.com` will match the `internal.example.com` zone.

```bash
# List all private zones to check for conflicts
gcloud dns managed-zones list \
    --filter="visibility=private" \
    --format="table(name,dnsName,privateVisibilityConfig.networks[].networkUrl)" \
    --project=my-project
```

Look for zones with overlapping DNS names attached to the same network.

## Step 7: Enable DNS Logging

DNS logging gives you visibility into every query and response. This is the most powerful debugging tool.

```bash
# Create a DNS policy with logging enabled
gcloud dns policies create dns-logging \
    --networks=my-vpc \
    --enable-logging \
    --project=my-project
```

Once logging is enabled, queries appear in Cloud Logging.

```bash
# Query DNS logs for a specific domain
gcloud logging read \
    'resource.type="dns_query" AND jsonPayload.queryName="myapp.internal.example.com."' \
    --limit=20 \
    --format=json \
    --project=my-project
```

The logs show you:
- The source VM IP
- The queried domain name
- The response code
- The response data
- Which zone was used to answer the query

This tells you definitively whether the query is reaching Cloud DNS and what Cloud DNS is returning.

## Step 8: Check Firewall Rules

VMs need to be able to reach the metadata server at `169.254.169.254` on UDP and TCP port 53. While GCP default firewall rules allow this, custom firewall rules might block it.

```bash
# List firewall rules that might affect DNS traffic
gcloud compute firewall-rules list \
    --filter="direction=EGRESS" \
    --format="table(name,direction,action,targetTags,destinationRanges)" \
    --project=my-project
```

If you have deny-all egress rules, you need to explicitly allow DNS traffic to the metadata server.

```bash
# Allow DNS traffic to the metadata server
gcloud compute firewall-rules create allow-dns-metadata \
    --direction=EGRESS \
    --action=ALLOW \
    --rules=udp:53,tcp:53 \
    --destination-ranges=169.254.169.254/32 \
    --priority=900 \
    --network=my-vpc \
    --project=my-project
```

## Step 9: Check the VM's DNS Configuration

Sometimes the issue is not with Cloud DNS at all but with the VM's local DNS configuration.

```bash
# Check the VM's DNS resolver configuration
cat /etc/resolv.conf

# It should show:
# nameserver 169.254.169.254
# search c.my-project.internal google.internal
```

If the VM's resolv.conf has been modified (maybe by a container runtime or custom startup script), it might not be using the Cloud DNS resolver at all.

```bash
# Check if systemd-resolved is interfering
systemctl status systemd-resolved

# Check the actual resolver being used
resolvectl status
```

## Step 10: Cross-Project Troubleshooting

If the private zone is in a different project than the VM, additional checks are needed.

```bash
# Verify the zone is attached to the correct cross-project network
# The network URL must use the full self-link format
gcloud dns managed-zones describe my-private-zone \
    --project=zone-project \
    --format=json | jq '.privateVisibilityConfig.networks'
```

The network URL in the zone configuration must match the full self-link of the VPC network, including the correct project ID.

## Quick Reference: Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| NXDOMAIN for existing record | Zone not attached to VM's network | Add network to zone |
| NXDOMAIN for public names | Zone shadowing | Narrow zone scope or add records |
| SERVFAIL | Forwarding target unreachable | Check network connectivity |
| Timeout | Firewall blocking DNS | Allow UDP/TCP 53 to 169.254.169.254 |
| Wrong answer | Multiple overlapping zones | Check zone precedence |
| Intermittent failures | DNS server policy misconfiguration | Review alternative nameservers |

## Wrapping Up

DNS troubleshooting in GCP private zones follows a logical chain: verify the zone, check the records, confirm network attachment, test from the VM, look for shadowing, and enable logging when things are not obvious. The single most helpful tool is DNS query logging - it eliminates guesswork by showing you exactly what Cloud DNS sees and returns. Enable it early in your troubleshooting process and you will save yourself hours of frustration.
