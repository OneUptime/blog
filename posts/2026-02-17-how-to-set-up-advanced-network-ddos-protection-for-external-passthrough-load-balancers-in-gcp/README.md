# How to Set Up Advanced Network DDoS Protection for External Passthrough Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, DDoS Protection, Cloud Armor, Load Balancer, Network Security

Description: Configure Google Cloud Armor Advanced Network DDoS Protection to defend external passthrough load balancers against volumetric and protocol-based DDoS attacks.

---

External passthrough load balancers in GCP handle TCP and UDP traffic without terminating connections. They are commonly used for game servers, VoIP, and custom protocols. The challenge is that they do not support standard Cloud Armor backend security policies because there is no HTTP layer to inspect. That is where Cloud Armor Advanced Network DDoS Protection comes in - it provides always-on, volumetric DDoS mitigation specifically for these network-level load balancers.

This guide walks through setting up Advanced Network DDoS Protection for your external passthrough load balancers.

## Understanding the Protection Layers

GCP provides two layers of DDoS protection:

**Standard Network DDoS Protection** is always on and free for all GCP resources. It mitigates common volumetric attacks like SYN floods and UDP amplification attacks. However, it operates with generic thresholds that may not be tuned for your specific traffic patterns.

**Advanced Network DDoS Protection** is a paid tier that adds per-resource traffic profiling, adaptive thresholds, and attack telemetry. It learns your normal traffic patterns and can detect anomalies that the standard tier would miss.

```mermaid
flowchart TD
    A[Incoming Traffic] --> B[Standard DDoS Protection]
    B --> C{Advanced Protection Enabled?}
    C -->|Yes| D[Traffic Profiling and Adaptive Thresholds]
    C -->|No| E[Generic Thresholds Only]
    D --> F[External Passthrough LB]
    E --> F
    F --> G[Backend VMs]
```

## Prerequisites

Before you begin:

- You need a GCP project with billing enabled
- Compute Engine API must be enabled, and Network Security API must be enabled for monitoring network edge policy metrics
- You should have an existing external passthrough network load balancer with a regional backend service (or be ready to create one)
- Your account needs permissions to manage Cloud Armor security policies and network edge security services, such as `compute.securityAdmin` plus the required Cloud Armor Enterprise enrollment permissions
- Advanced Network DDoS Protection requires enrollment in Cloud Armor Enterprise

## Step 1: Enable Cloud Armor Enterprise

Advanced Network DDoS Protection requires a Cloud Armor Enterprise subscription. Enroll the project in Cloud Armor Enterprise Paygo, or enroll it in Cloud Armor Enterprise Annual after subscribing the billing account:

```bash
# Enroll the project in Cloud Armor Enterprise Paygo
gcloud compute project-info update \
  --cloud-armor-tier=CA_ENTERPRISE_PAYGO \
  --project=your-project-id

# Or enroll the project in Cloud Armor Enterprise Annual
gcloud compute project-info update \
  --cloud-armor-tier=CA_ENTERPRISE_ANNUAL \
  --project=your-project-id
```

You can verify the enrollment status:

```bash
# Check Cloud Armor Enterprise enrollment
gcloud compute project-info describe \
  --project=your-project-id \
  --format="value(cloudArmorTier)"
```

## Step 2: Create a Network Security Policy

Unlike HTTP(S) load balancers that use standard Cloud Armor policies, external passthrough load balancers use network-edge security policies:

```bash
# Create a network edge security policy
gcloud compute security-policies create network-ddos-policy \
  --type=CLOUD_ARMOR_NETWORK \
  --region=us-central1 \
  --description="Advanced DDoS protection for passthrough LB" \
  --project=your-project-id
```

Note that network security policies are regional, matching the region of your external passthrough load balancer.

## Step 3: Enable Advanced DDoS Protection on the Policy

Enable the advanced protection features on your network security policy:

```bash
# Enable advanced DDoS protection
gcloud compute security-policies update network-ddos-policy \
  --region=us-central1 \
  --network-ddos-protection=ADVANCED \
  --project=your-project-id
```

This turns on traffic profiling and adaptive threshold detection for the region where the policy is attached through a network edge security service.

## Step 4: Add Network Filtering Rules

The security policy used to enable Advanced Network DDoS Protection cannot have custom rules added after it is created. If you also want allow and deny rules, create a separate network edge security policy for traffic filtering and attach that policy to your load balancer's regional backend service:

```bash
# Create a separate network edge security policy for custom filtering rules
gcloud compute security-policies create network-filtering-policy \
  --type=CLOUD_ARMOR_NETWORK \
  --region=us-central1 \
  --description="Network edge filtering for passthrough LB" \
  --project=your-project-id

# Allow traffic from specific IP ranges
gcloud compute security-policies rules create 1000 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --network-src-ip-ranges="203.0.113.0/24,198.51.100.0/24" \
  --network-dest-ports="443,8443" \
  --network-ip-protocols="tcp" \
  --action=allow \
  --description="Allow traffic from known client ranges on expected ports"

# Block traffic from known bad IP ranges
gcloud compute security-policies rules create 2000 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --network-src-ip-ranges="192.0.2.0/24" \
  --action=deny \
  --description="Block traffic from known malicious ranges"

# Set default rule to allow (after DDoS filtering)
gcloud compute security-policies rules update 2147483647 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --action=allow \
  --description="Default allow after DDoS mitigation"
```

Attach the filtering policy to the backend service used by your external passthrough load balancer:

```bash
# List regional backend services to find the right one
gcloud compute backend-services list \
  --filter="loadBalancingScheme=EXTERNAL" \
  --project=your-project-id

# Attach the filtering policy to the backend service
gcloud compute backend-services update your-backend-service \
  --region=us-central1 \
  --security-policy=network-filtering-policy \
  --project=your-project-id
```

## Step 5: Create the Network Edge Security Service

The Advanced Network DDoS Protection policy is enabled for the region by attaching it to a network edge security service. This protects applicable external passthrough Network Load Balancers, protocol forwarding rules, and VMs with public IP addresses in that region:

```bash
# Create a network edge security service for the region
gcloud compute network-edge-security-services create network-ddos-service \
  --security-policy=network-ddos-policy \
  --region=us-central1 \
  --project=your-project-id
```

## Step 6: Configure Traffic Profiling

Advanced Network DDoS Protection automatically profiles your traffic after attachment. The profiling period typically takes about 24 hours to establish a baseline. During this learning period, the system is still providing protection using standard thresholds, but the adaptive detection improves as it learns your normal patterns.

You can check the profiling status:

```bash
# Check the security policy details including profiling status
gcloud compute security-policies describe network-ddos-policy \
  --region=us-central1 \
  --project=your-project-id \
  --format=yaml
```

## Monitoring and Alerting

Set up monitoring to get visibility into DDoS attack detection and mitigation:

```bash
# View DDoS attack logs
gcloud logging read \
  'resource.type="network_security_policy" AND jsonPayload.mitigationType:*' \
  --project=your-project-id \
  --limit=20 \
  --format=json
```

For real-time visibility, set up a Cloud Monitoring dashboard with the following metrics:

- `networksecurity.googleapis.com/l3/external/packet_count` - packets matched by network edge security policy rules
- `networksecurity.googleapis.com/dos/ingress_packets_count` - ingress packets broken down by allowed or dropped status
- Network throughput to your forwarding rules

```bash
# Create an alert for dropped packets during DDoS mitigation
gcloud alpha monitoring policies create \
  --display-name="DDoS Attack Detected" \
  --condition-display-name="DDoS dropped packets detected" \
  --condition-filter='resource.type="networksecurity.googleapis.com/ProtectedEndpoint" AND metric.type="networksecurity.googleapis.com/dos/ingress_packets_count" AND metric.labels.drop_status="dropped"' \
  --if="> 10000" \
  --duration=60s \
  --notification-channels=your-channel-id
```

## Tuning for Specific Protocols

If your passthrough load balancer handles specific protocols, you can create targeted rules:

```bash
# For a game server - allow UDP on game ports, block everything else
gcloud compute security-policies rules create 1000 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --network-dest-ports="27015-27030" \
  --network-ip-protocols="udp" \
  --action=allow \
  --description="Allow UDP traffic on game server ports"

# Block UDP on non-game ports to prevent amplification abuse
gcloud compute security-policies rules create 1100 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --network-ip-protocols="udp" \
  --action=deny \
  --description="Block UDP on all other ports"
```

## Handling Attack Events

When an attack is detected, Advanced Network DDoS Protection automatically applies mitigation. You can see active mitigations:

```bash
# List active DDoS mitigations
gcloud compute security-policies describe network-ddos-policy \
  --region=us-central1 \
  --format="yaml(name,region,ddosProtectionConfig)" \
  --project=your-project-id
```

During an active attack, you may want to add temporary rules to further restrict traffic. For example, if you want to allow only traffic from your primary market, add a high-priority allow rule and change the default rule to deny while the emergency restriction is in place:

```bash
# Emergency rule to only allow traffic from your primary market
gcloud compute security-policies rules create 100 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --network-src-ip-ranges="0.0.0.0/0" \
  --network-src-region-codes="US,CA" \
  --action=allow \
  --description="Emergency: restrict to US/CA traffic only during attack"

# Deny traffic that does not match the emergency allow rule
gcloud compute security-policies rules update 2147483647 \
  --security-policy=network-filtering-policy \
  --region=us-central1 \
  --action=deny \
  --description="Emergency default deny during attack"
```

## Cost Considerations

Advanced Network DDoS Protection is part of Cloud Armor Enterprise, which has Paygo and Annual enrollment options. Factor this into your budget, especially if you enable protection across multiple production regions. For most production workloads facing real DDoS risk, the cost is justified by the protection and telemetry you get.

## Key Differences from HTTP(S) DDoS Protection

Keep these distinctions in mind:

- Network policies operate at layers 3 and 4, not layer 7
- No WAF rules, header inspection, or path matching
- Rules are regional, not global
- Advanced Network DDoS policies attach through a regional network edge security service, while custom network edge filtering policies attach to regional backend services or VM network interfaces
- Traffic profiling is automatic and continuous

## Wrapping Up

Advanced Network DDoS Protection fills an important security gap for external passthrough load balancers in GCP. While standard DDoS protection covers basic volumetric attacks, the advanced tier gives you adaptive thresholds, traffic profiling, and detailed attack telemetry that are essential for any production workload handling non-HTTP traffic. The setup is straightforward, and the protection starts working immediately while it builds its traffic profile over the first 24 hours. If you are running game servers, VoIP services, or any custom protocol behind passthrough load balancers, this should be part of your production security baseline.
