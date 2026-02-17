# How to Configure a Secure VPC Network Baseline for a New GCP Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC, Networking, Security, Firewall Rules, Cloud NAT

Description: Set up a secure VPC network baseline for a new GCP project including custom subnets, firewall rules, Cloud NAT, Private Google Access, and network monitoring.

---

The default VPC that comes with every GCP project is designed for convenience, not security. It has auto-created subnets in every region, overly permissive firewall rules, and no network segmentation. For any project that will host production workloads, the first thing you should do is delete the default VPC and build a secure network from scratch.

Here is how to set up a VPC baseline that gives you a solid security posture while still being practical to work with.

## Step 1: Delete the Default VPC

The default VPC comes with firewall rules that allow SSH and RDP from anywhere on the internet. Remove it:

```bash
# Delete all firewall rules in the default network
gcloud compute firewall-rules list \
  --filter="network=default" \
  --format="value(name)" | while read rule; do
  gcloud compute firewall-rules delete "$rule" --quiet
done

# Delete the default network
gcloud compute networks delete default --quiet
```

## Step 2: Create a Custom VPC

Design your VPC with custom subnets that match your application architecture:

```bash
# Create a custom VPC with no auto-created subnets
gcloud compute networks create prod-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=global \
  --description="Production VPC network"
```

The `--bgp-routing-mode=global` setting allows Cloud Router to advertise routes across all regions, which is useful if you plan to use hybrid connectivity later.

## Step 3: Plan and Create Subnets

Plan your IP address ranges to avoid overlaps, especially if you will eventually peer with other VPCs or connect to on-premises networks.

A good practice is to use /20 or /24 ranges depending on the expected number of instances:

```bash
# Application tier subnet - hosts web servers and application instances
gcloud compute networks subnets create app-subnet \
  --network=prod-vpc \
  --region=us-central1 \
  --range=10.0.1.0/24 \
  --enable-private-ip-google-access \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=0.5

# Database tier subnet - hosts Cloud SQL and other database instances
gcloud compute networks subnets create db-subnet \
  --network=prod-vpc \
  --region=us-central1 \
  --range=10.0.2.0/24 \
  --enable-private-ip-google-access \
  --enable-flow-logs

# GKE subnet - dedicated range for Kubernetes clusters
gcloud compute networks subnets create gke-subnet \
  --network=prod-vpc \
  --region=us-central1 \
  --range=10.0.4.0/22 \
  --enable-private-ip-google-access \
  --enable-flow-logs \
  --secondary-range=pods=10.4.0.0/14,services=10.8.0.0/20

# Management subnet - for bastion hosts and admin access
gcloud compute networks subnets create mgmt-subnet \
  --network=prod-vpc \
  --region=us-central1 \
  --range=10.0.0.0/28 \
  --enable-private-ip-google-access
```

Key decisions:
- **Private Google Access** is enabled on every subnet so instances without external IPs can reach Google APIs
- **VPC Flow Logs** are enabled for monitoring and troubleshooting
- **Secondary ranges** on the GKE subnet provide dedicated IP space for pods and services

## Step 4: Configure Firewall Rules

Start with a deny-all baseline, then add specific allow rules. This is the opposite of the default VPC approach (which allows too much).

```bash
# Rule 1: Deny all ingress by default (this is already implied, but being explicit is good practice)
gcloud compute firewall-rules create deny-all-ingress \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=DENY \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --priority=65000 \
  --description="Explicit deny-all ingress rule"

# Rule 2: Allow internal communication between all subnets
gcloud compute firewall-rules create allow-internal \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=all \
  --source-ranges=10.0.0.0/8 \
  --priority=1000 \
  --description="Allow all traffic between internal subnets"

# Rule 3: Allow SSH only to management subnet from specific IPs
gcloud compute firewall-rules create allow-ssh-mgmt \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=203.0.113.0/24 \
  --target-tags=allow-ssh \
  --priority=1000 \
  --description="Allow SSH from office network to tagged instances"

# Rule 4: Allow IAP for TCP tunneling (preferred over direct SSH)
gcloud compute firewall-rules create allow-iap-ssh \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=allow-iap \
  --priority=900 \
  --description="Allow SSH via Identity-Aware Proxy"

# Rule 5: Allow health check probes from Google's health check ranges
gcloud compute firewall-rules create allow-health-checks \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:80,tcp:443,tcp:8080 \
  --source-ranges=35.191.0.0/16,130.211.0.0/22 \
  --target-tags=web-server \
  --priority=1000 \
  --description="Allow Google health check probes"

# Rule 6: Allow load balancer traffic
gcloud compute firewall-rules create allow-lb-traffic \
  --network=prod-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=web-server \
  --priority=1000 \
  --description="Allow HTTP/HTTPS from load balancer"
```

### Firewall Rule Design Principles

- **Use network tags** to target specific instances rather than applying rules to all instances
- **Use IAP for SSH** instead of opening port 22 to the internet. IAP tunnels SSH through Google's infrastructure with IAM-based access control
- **Log denied traffic** for security analysis
- **Review rules regularly** and remove any that are no longer needed

Enable firewall rules logging for security monitoring:

```bash
# Enable logging on the deny-all rule to catch unauthorized access attempts
gcloud compute firewall-rules update deny-all-ingress \
  --enable-logging
```

## Step 5: Set Up Cloud NAT

Cloud NAT provides outbound internet access for instances that do not have external IP addresses. This is essential for pulling software updates, accessing external APIs, and other outbound traffic.

```bash
# Create a Cloud Router (required for Cloud NAT)
gcloud compute routers create prod-router \
  --network=prod-vpc \
  --region=us-central1

# Create Cloud NAT configuration
gcloud compute routers nats create prod-nat \
  --router=prod-router \
  --region=us-central1 \
  --auto-allocate-nat-external-ips \
  --nat-all-subnet-ip-ranges \
  --enable-logging
```

With Cloud NAT in place, your instances can reach the internet for outbound connections without having external IPs, and external traffic cannot initiate connections to your instances.

## Step 6: Set Up Private Service Connect or Private Access

For accessing Google APIs and services without going through the public internet:

```bash
# Private Google Access is already enabled on subnets (from Step 3)
# For more control, set up Private Service Connect

# Reserve an IP address for the Private Service Connect endpoint
gcloud compute addresses create google-apis-endpoint \
  --global \
  --purpose=PRIVATE_SERVICE_CONNECT \
  --addresses=10.0.100.1 \
  --network=prod-vpc

# Create the Private Service Connect endpoint
gcloud compute forwarding-rules create google-apis-psc \
  --global \
  --network=prod-vpc \
  --address=google-apis-endpoint \
  --target-google-apis-bundle=all-apis
```

## Step 7: Configure DNS

Set up Cloud DNS for internal name resolution:

```bash
# Create a private DNS zone for internal service discovery
gcloud dns managed-zones create internal-zone \
  --dns-name=internal.company.com. \
  --description="Internal DNS zone" \
  --visibility=private \
  --networks=prod-vpc

# Add records for internal services
gcloud dns record-sets create db.internal.company.com. \
  --zone=internal-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=10.0.2.5
```

## Step 8: Enable Network Monitoring

Set up monitoring for your network:

```bash
# Create a log-based metric for denied firewall traffic
gcloud logging metrics create denied-traffic-count \
  --description="Count of firewall-denied traffic" \
  --log-filter='resource.type="gce_subnetwork" AND jsonPayload.disposition="DENIED"'

# Create an alert for unusual denied traffic patterns
gcloud monitoring policies create \
  --display-name="High Denied Traffic Alert" \
  --condition-display-name="Denied traffic spike" \
  --condition-filter='metric.type="logging.googleapis.com/user/denied-traffic-count"' \
  --condition-threshold-value=100 \
  --condition-comparison=COMPARISON_GT \
  --combiner=OR \
  --notification-channels=CHANNEL_ID
```

## Step 9: Document the Network Architecture

Keep a living document of your network configuration:

```
VPC: prod-vpc
Region: us-central1
BGP Routing: Global

Subnets:
  app-subnet:    10.0.1.0/24  - Application tier
  db-subnet:     10.0.2.0/24  - Database tier
  gke-subnet:    10.0.4.0/22  - GKE nodes
    pods:        10.4.0.0/14  - GKE pods
    services:    10.8.0.0/20  - GKE services
  mgmt-subnet:   10.0.0.0/28  - Management/bastion

Cloud NAT: prod-nat (all subnets)
Cloud Router: prod-router

Firewall Rules:
  allow-internal:     10.0.0.0/8 -> all, all protocols (priority 1000)
  allow-iap-ssh:      35.235.240.0/20 -> tagged, TCP:22 (priority 900)
  allow-health-checks: 35.191.0.0/16 -> tagged, TCP:80,443,8080 (priority 1000)
  allow-lb-traffic:    0.0.0.0/0 -> tagged, TCP:80,443 (priority 1000)
  deny-all-ingress:    0.0.0.0/0 -> all, all protocols (priority 65000)
```

## Network Security Checklist

For every new project, verify:

- [ ] Default VPC deleted
- [ ] Custom VPC created with custom subnets
- [ ] Private Google Access enabled on all subnets
- [ ] VPC Flow Logs enabled on production subnets
- [ ] Deny-all ingress firewall rule in place
- [ ] Specific allow rules for required traffic only
- [ ] IAP configured for SSH access (not direct SSH from internet)
- [ ] Cloud NAT configured for outbound internet access
- [ ] No instances have external IP addresses (unless explicitly required)
- [ ] Health check firewall rules allow Google's health check ranges
- [ ] Firewall rule logging enabled for deny rules
- [ ] Network monitoring and alerting configured

## Wrapping Up

A secure VPC baseline starts with deleting the default network and building from scratch with explicit rules. The key principles are: deny all ingress by default, allow only what is needed, use IAP instead of direct SSH, keep instances private with Cloud NAT for outbound access, and enable flow logs and firewall logging for visibility. This baseline gives you a secure foundation that you can extend as your workloads grow, without having to retroactively lock down a permissive network.
