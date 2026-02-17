# How to Set Up VPC Firewall Rules to Allow SSH Access Only from Specific IP Ranges in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC, Firewall Rules, SSH, Security

Description: Step-by-step guide to configuring GCP VPC firewall rules that restrict SSH access to specific trusted IP ranges, including IAP tunneling as a more secure alternative.

---

Leaving SSH open to the entire internet (0.0.0.0/0) on port 22 is one of the most common security mistakes in cloud deployments. It turns every VM in your network into a potential target for brute-force attacks. GCP firewall rules let you lock down SSH access to only the IP ranges you trust, and with Identity-Aware Proxy (IAP), you can eliminate the need for public SSH access entirely.

In this post, I will show you how to set up firewall rules that restrict SSH to specific IPs, how to use IAP as a more secure alternative, and how to audit your existing rules for overly permissive access.

## Understanding GCP Firewall Rules

GCP firewall rules operate at the VPC network level. Every rule has:

- **Direction**: INGRESS (incoming) or EGRESS (outgoing)
- **Action**: ALLOW or DENY
- **Priority**: 0 to 65535 (lower number = higher priority)
- **Source ranges**: Who can send traffic (for ingress rules)
- **Target**: Which VMs the rule applies to (all instances, specific tags, or service accounts)
- **Protocols and ports**: What traffic is allowed

Rules are stateful - if an ingress rule allows a connection, the response traffic is automatically allowed regardless of egress rules.

## Removing Overly Permissive SSH Rules

First, check if you have any rules allowing SSH from anywhere:

```bash
# Find firewall rules that allow SSH from 0.0.0.0/0
gcloud compute firewall-rules list \
  --filter="allowed[].ports:22 AND sourceRanges:0.0.0.0/0" \
  --format="table(name, network, sourceRanges, targetTags)"
```

The default VPC network comes with a rule called `default-allow-ssh` that allows SSH from anywhere. Delete it or modify it:

```bash
# Delete the overly permissive default SSH rule
gcloud compute firewall-rules delete default-allow-ssh --quiet
```

## Creating SSH Rules for Specific IP Ranges

Now create rules that only allow SSH from your trusted networks. Common scenarios include your office IP range and a VPN gateway:

```bash
# Allow SSH only from your office network
gcloud compute firewall-rules create allow-ssh-from-office \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=203.0.113.0/24 \
  --priority=1000 \
  --description="Allow SSH from office network only"
```

If you have multiple trusted networks, specify them as a comma-separated list:

```bash
# Allow SSH from multiple trusted networks
gcloud compute firewall-rules create allow-ssh-trusted-networks \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=203.0.113.0/24,198.51.100.0/24,192.0.2.10/32 \
  --priority=1000 \
  --description="Allow SSH from office, VPN, and admin workstation"
```

## Targeting Specific VMs with Network Tags

You might not want SSH enabled on every VM. Use network tags to target only specific instances:

```bash
# Allow SSH only to VMs tagged with 'allow-ssh'
gcloud compute firewall-rules create allow-ssh-tagged-vms \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=203.0.113.0/24 \
  --target-tags=allow-ssh \
  --priority=1000 \
  --description="Allow SSH from office to tagged VMs only"
```

Then tag the VMs that should be accessible:

```bash
# Add the SSH tag to a specific VM
gcloud compute instances add-tags my-bastion-vm \
  --zone=us-central1-a \
  --tags=allow-ssh
```

## Using IAP Tunneling Instead of Direct SSH

The most secure approach is to use Identity-Aware Proxy (IAP) for SSH access. With IAP, you do not need to expose port 22 to any external IP. Instead, IAP creates a tunnel through Google's network, and access is controlled by IAM policies.

First, create a firewall rule that allows SSH only from IAP's IP range:

```bash
# Allow SSH only from IAP's IP range (35.235.240.0/20)
# This is the only external range needed for IAP tunneling
gcloud compute firewall-rules create allow-ssh-from-iap \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --description="Allow SSH via IAP tunnel only"
```

Then connect to your VMs using IAP:

```bash
# SSH into a VM through IAP - no external IP needed on the VM
gcloud compute ssh my-vm \
  --zone=us-central1-a \
  --tunnel-through-iap
```

Grant IAP tunnel access to specific users via IAM:

```bash
# Grant a user permission to use IAP tunnels
gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@mycompany.com" \
  --role="roles/iap.tunnelResourceAccessor"
```

You can also restrict IAP access to specific VMs using IAM conditions:

```bash
# Grant IAP access only to VMs with a specific tag
gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@mycompany.com" \
  --role="roles/iap.tunnelResourceAccessor" \
  --condition='expression=resource.name.startsWith("projects/my-project/zones/us-central1-a/instances/dev-"),title=dev-vms-only'
```

## Creating a Deny-All SSH Baseline

For defense in depth, create a low-priority deny rule that blocks SSH from everywhere, then create higher-priority allow rules for specific sources:

```bash
# Deny SSH from everywhere at low priority (high number = low priority)
gcloud compute firewall-rules create deny-ssh-all \
  --network=production-vpc \
  --direction=INGRESS \
  --action=DENY \
  --rules=tcp:22 \
  --source-ranges=0.0.0.0/0 \
  --priority=65534 \
  --description="Default deny SSH from everywhere"
```

```bash
# Allow SSH from IAP at higher priority (lower number)
gcloud compute firewall-rules create allow-ssh-iap \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --priority=1000 \
  --description="Allow SSH via IAP (overrides deny-all)"
```

The allow rule at priority 1000 takes precedence over the deny rule at priority 65534 for traffic from IAP's range. Everything else hits the deny rule.

## Auditing Existing Firewall Rules

Regularly audit your firewall rules to catch overly permissive configurations:

```bash
# List all ingress rules that allow traffic from 0.0.0.0/0
gcloud compute firewall-rules list \
  --filter="direction=INGRESS AND sourceRanges:0.0.0.0/0" \
  --format="table(name, network, allowed[].map().firewall_rule().list(), sourceRanges, targetTags)"
```

```bash
# Find rules allowing any port from any source
gcloud compute firewall-rules list \
  --filter="direction=INGRESS AND sourceRanges:0.0.0.0/0 AND allowed[].ports:*" \
  --format="table(name, network, allowed)"
```

## Logging Firewall Rule Hits

Enable logging on your SSH firewall rules to track who is connecting:

```bash
# Enable logging on the SSH firewall rule
gcloud compute firewall-rules update allow-ssh-from-office \
  --enable-logging \
  --logging-metadata=include-all
```

You can then query these logs in Cloud Logging:

```bash
# View SSH firewall rule logs from the last hour
gcloud logging read 'resource.type="gce_subnetwork" AND jsonPayload.rule_details.reference:allow-ssh-from-office' \
  --limit=50 \
  --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.connection.dest_ip, jsonPayload.disposition)"
```

## OS Login as an Additional Layer

Beyond firewall rules, enable OS Login to manage SSH access through IAM instead of individual SSH keys:

```bash
# Enable OS Login at the project level
gcloud compute project-info add-metadata \
  --metadata enable-oslogin=TRUE
```

With OS Login enabled, users need both the firewall rule to allow their traffic and the appropriate IAM role (`roles/compute.osLogin` or `roles/compute.osAdminLogin`) to actually authenticate.

## Wrapping Up

Restricting SSH access is one of the highest-impact security improvements you can make in GCP. Start by deleting or modifying any rules that allow SSH from 0.0.0.0/0. Then decide between IP-based restrictions and IAP tunneling - or use both. IAP is the gold standard because it eliminates the need for external IPs and ties access to IAM identities, giving you fine-grained access control and audit logging without managing IP allowlists. Whatever approach you choose, enable firewall logging and audit your rules regularly to catch drift.
