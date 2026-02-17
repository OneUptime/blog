# How to Configure Egress Firewall Rules to Restrict Outbound Traffic in GCP VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall Rules, Egress, VPC, Security

Description: Learn how to configure egress firewall rules in GCP VPC to restrict outbound traffic from VMs, preventing data exfiltration and limiting external connectivity to approved destinations.

---

Most teams focus on ingress firewall rules - controlling what traffic can come in. But egress rules are equally important. Without egress restrictions, a compromised VM can freely communicate with any IP address on the internet, exfiltrate data, download malicious payloads, or participate in a botnet. GCP allows all egress traffic by default, and changing that default is one of the most impactful security hardening steps you can take.

In this post, I will show you how to implement egress firewall rules that restrict outbound traffic to only approved destinations.

## The Default Egress Behavior

Every GCP VPC has an implied egress allow rule with the lowest possible priority (65535). This rule allows all outbound traffic to any destination. You cannot see it in the firewall rules list, but it is there:

```bash
# List all egress rules - you won't see the implied allow-all rule
gcloud compute firewall-rules list \
  --filter="network=production-vpc AND direction=EGRESS" \
  --format="table(name, direction, action, destinationRanges, priority)"
```

To restrict egress, you create explicit DENY rules at a lower priority number (higher priority) than the implied rule.

## Strategy: Default Deny with Explicit Allows

The most secure approach is to deny all egress by default and then create allow rules for specific destinations:

```bash
# Step 1: Deny all egress traffic at priority 65534
# This overrides the implied allow-all at 65535
gcloud compute firewall-rules create deny-all-egress \
  --network=production-vpc \
  --direction=EGRESS \
  --action=DENY \
  --rules=all \
  --destination-ranges=0.0.0.0/0 \
  --priority=65534 \
  --description="Default deny all outbound traffic"
```

Now nothing can leave the VPC. You need to add back the traffic you actually want to allow.

## Allowing Essential Google Services

VMs need to reach Google APIs for many basic functions - logging, monitoring, metadata server access, and package updates:

```bash
# Allow egress to Google APIs (restricted VIP range)
gcloud compute firewall-rules create allow-egress-google-apis \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:443 \
  --destination-ranges=199.36.153.4/30 \
  --priority=1000 \
  --description="Allow HTTPS to Google APIs via restricted VIP"
```

```bash
# Allow egress to Google's health check ranges (needed for load balancers)
gcloud compute firewall-rules create allow-egress-health-checks \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp \
  --destination-ranges=35.191.0.0/16,130.211.0.0/22 \
  --priority=1000 \
  --description="Allow egress to Google health check probes"
```

```bash
# Allow egress to the metadata server (essential for VM operation)
gcloud compute firewall-rules create allow-egress-metadata \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=all \
  --destination-ranges=169.254.169.254/32 \
  --priority=1000 \
  --description="Allow access to metadata server"
```

## Allowing Internal VPC Traffic

VMs within your VPC should typically be allowed to communicate with each other:

```bash
# Allow all egress to internal VPC subnets
gcloud compute firewall-rules create allow-egress-internal \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=all \
  --destination-ranges=10.10.0.0/20,10.20.0.0/20 \
  --priority=1000 \
  --description="Allow all egress to internal VPC subnets"
```

## Allowing Specific External Destinations

For VMs that need to reach specific external services, create targeted egress rules:

```bash
# Allow egress to a specific third-party API
gcloud compute firewall-rules create allow-egress-payment-api \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:443 \
  --destination-ranges=198.51.100.0/24 \
  --target-tags=payment-service \
  --priority=1000 \
  --description="Allow HTTPS to payment processor API"
```

```bash
# Allow egress to package repositories for updates
gcloud compute firewall-rules create allow-egress-apt \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:80,tcp:443 \
  --destination-ranges=0.0.0.0/0 \
  --target-tags=allow-package-updates \
  --priority=900 \
  --description="Allow HTTP/S for package updates (tagged VMs only)"
```

Notice how the package update rule uses `target-tags`. Only VMs explicitly tagged with `allow-package-updates` can reach the internet for updates. Everything else stays locked down.

## Targeted Egress by Service Account

For stronger access control, use service accounts instead of tags:

```bash
# Allow egress for web servers to reach specific backend services
gcloud compute firewall-rules create allow-egress-web-to-api \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:8080 \
  --destination-ranges=10.20.0.0/20 \
  --target-service-accounts=web-sa@my-project.iam.gserviceaccount.com \
  --priority=1000 \
  --description="Allow web servers to reach API servers"
```

## Logging Denied Egress Traffic

Enable logging on your deny rule to see what traffic is being blocked. This helps you identify legitimate traffic that needs an allow rule:

```bash
# Enable logging on the deny-all egress rule
gcloud compute firewall-rules update deny-all-egress \
  --enable-logging \
  --logging-metadata=include-all
```

Query the logs to see blocked traffic:

```bash
# Find blocked egress traffic in Cloud Logging
gcloud logging read '
  resource.type="gce_subnetwork"
  AND jsonPayload.disposition="DENIED"
  AND jsonPayload.rule_details.direction="EGRESS"
' --limit=100 --format="table(timestamp, jsonPayload.connection.src_ip, jsonPayload.connection.dest_ip, jsonPayload.connection.dest_port)"
```

## Handling DNS Resolution

If you block all egress, VMs cannot resolve DNS unless you explicitly allow it. DNS typically goes to Google's internal resolver (169.254.169.254), which is already covered by the metadata rule. But if your VMs use external DNS servers, add a rule for them:

```bash
# Allow DNS queries to Cloud DNS
gcloud compute firewall-rules create allow-egress-dns \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:53,udp:53 \
  --destination-ranges=169.254.169.254/32 \
  --priority=1000 \
  --description="Allow DNS resolution"
```

## Egress Rules for GKE Clusters

GKE clusters need egress for several things:

```bash
# Allow GKE nodes to reach the control plane
gcloud compute firewall-rules create allow-egress-gke-control-plane \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:443,tcp:10250 \
  --destination-ranges=172.16.0.0/28 \
  --target-tags=gke-my-cluster-nodes \
  --priority=1000 \
  --description="Allow GKE nodes to reach control plane"

# Allow GKE nodes to pull container images
gcloud compute firewall-rules create allow-egress-gcr \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:443 \
  --destination-ranges=199.36.153.4/30 \
  --target-tags=gke-my-cluster-nodes \
  --priority=1000 \
  --description="Allow GKE nodes to pull from GCR/Artifact Registry"
```

## Complete Example: Production Egress Ruleset

Here is a complete set of egress rules for a typical production environment:

```bash
# 1. Default deny all egress
gcloud compute firewall-rules create deny-all-egress \
  --network=production-vpc --direction=EGRESS --action=DENY \
  --rules=all --destination-ranges=0.0.0.0/0 --priority=65534

# 2. Allow internal VPC communication
gcloud compute firewall-rules create allow-egress-internal \
  --network=production-vpc --direction=EGRESS --action=ALLOW \
  --rules=all --destination-ranges=10.0.0.0/8 --priority=1000

# 3. Allow Google APIs
gcloud compute firewall-rules create allow-egress-google \
  --network=production-vpc --direction=EGRESS --action=ALLOW \
  --rules=tcp:443 --destination-ranges=199.36.153.4/30 --priority=1000

# 4. Allow metadata server
gcloud compute firewall-rules create allow-egress-metadata \
  --network=production-vpc --direction=EGRESS --action=ALLOW \
  --rules=all --destination-ranges=169.254.169.254/32 --priority=1000

# 5. Allow DNS
gcloud compute firewall-rules create allow-egress-dns \
  --network=production-vpc --direction=EGRESS --action=ALLOW \
  --rules=udp:53,tcp:53 --destination-ranges=169.254.169.254/32 --priority=1000

# 6. Allow NTP for time synchronization
gcloud compute firewall-rules create allow-egress-ntp \
  --network=production-vpc --direction=EGRESS --action=ALLOW \
  --rules=udp:123 --destination-ranges=169.254.169.254/32 --priority=1000
```

## Testing Your Egress Rules

After implementing egress restrictions, test from a VM to make sure legitimate traffic works:

```bash
# Test Google API access
curl -s -o /dev/null -w "%{http_code}" https://storage.googleapis.com

# Test internal connectivity
ping -c 3 10.10.0.10

# Test that external access is blocked
curl -s --connect-timeout 5 https://example.com || echo "Blocked as expected"
```

## Wrapping Up

Egress firewall rules are an essential layer of defense that most GCP deployments neglect. The default allow-all egress policy means a compromised VM has unrestricted outbound connectivity. Implementing a deny-by-default egress policy with explicit allows for approved destinations significantly reduces your blast radius. Start by enabling logging on a deny rule to see what egress traffic your environment actually needs, then build your allow list from that data. It takes some effort to get right, but the security improvement is substantial.
