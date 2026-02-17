# How to Deploy and Configure Cloud Next-Generation Firewall for Advanced Threat Prevention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud NGFW, Firewall, Network Security, Threat Prevention

Description: Learn how to deploy and configure Google Cloud's Next-Generation Firewall with intrusion prevention, TLS inspection, and threat intelligence for advanced network security.

---

Google Cloud's standard firewall rules handle basic allow/deny filtering based on IP addresses, ports, and protocols. That is fine for simple segmentation, but it does not help when you need to inspect traffic for malware, detect intrusion attempts, or enforce application-layer policies. Cloud Next-Generation Firewall (Cloud NGFW) fills this gap with deep packet inspection, intrusion prevention, and TLS inspection capabilities built directly into the cloud networking stack.

This guide covers deploying Cloud NGFW, configuring security profiles for threat detection, setting up TLS inspection, and managing firewall policies across your organization.

## What Cloud NGFW Provides

Cloud NGFW builds on top of standard VPC firewall rules with these additional capabilities:

- **Intrusion Prevention System (IPS)** - inspects traffic for known attack signatures and blocks malicious packets
- **TLS Inspection** - decrypts TLS traffic for inspection, then re-encrypts it before delivery
- **Threat Intelligence** - integrates with Google's threat intelligence feeds to block traffic from known malicious IPs
- **FQDN-based rules** - filter traffic by domain name, not just IP address
- **Geo-location filtering** - allow or deny traffic based on geographic origin

Cloud NGFW operates at the network level as a Google-managed service. You do not deploy or manage appliances - you configure policies and Google handles the infrastructure.

## Enabling Cloud NGFW

Cloud NGFW requires enabling the Network Security API and creating firewall endpoints.

```bash
# Enable the required APIs
gcloud services enable networksecurity.googleapis.com \
  --project=my-network-project

gcloud services enable certificatemanager.googleapis.com \
  --project=my-network-project

# Create a firewall endpoint in a specific zone
gcloud network-security firewall-endpoints create ngfw-endpoint-1 \
  --zone=us-central1-a \
  --organization=123456789 \
  --billing-project=my-network-project
```

Firewall endpoints are zonal resources. You need one in each zone where you want NGFW inspection to occur.

## Creating Security Profiles

Security profiles define what the NGFW inspects and how it responds to threats. A security profile contains threat prevention settings including IPS signatures and severity-based actions.

```bash
# Create a security profile group for threat prevention
gcloud network-security security-profile-groups create prod-security-group \
  --organization=123456789 \
  --threat-prevention-profile=organizations/123456789/locations/global/securityProfiles/prod-threat-profile \
  --description="Production threat prevention profile group"

# Create the threat prevention profile with custom overrides
gcloud network-security security-profiles threat-prevention create prod-threat-profile \
  --organization=123456789 \
  --location=global \
  --description="Threat prevention with IPS for production"
```

### Configuring Threat Override Actions

You can customize how the IPS handles different severity levels of threats.

```bash
# Set severity-based actions for the threat prevention profile
gcloud network-security security-profiles threat-prevention update prod-threat-profile \
  --organization=123456789 \
  --location=global \
  --severity-overrides="severity=CRITICAL,action=DENY" \
  --severity-overrides="severity=HIGH,action=DENY" \
  --severity-overrides="severity=MEDIUM,action=ALERT" \
  --severity-overrides="severity=LOW,action=ALLOW"
```

This configuration blocks critical and high-severity threats, alerts on medium, and allows low-severity traffic to pass.

## Associating Endpoints with VPC Networks

After creating endpoints and security profiles, associate them with your VPC networks.

```bash
# Associate the firewall endpoint with a VPC network
gcloud network-security firewall-endpoint-associations create prod-association \
  --endpoint=organizations/123456789/locations/us-central1-a/firewallEndpoints/ngfw-endpoint-1 \
  --network=projects/my-network-project/global/networks/prod-vpc \
  --zone=us-central1-a \
  --tls-inspection-policy=projects/my-network-project/locations/global/tlsInspectionPolicies/prod-tls-policy \
  --project=my-network-project
```

## Creating Firewall Policies with NGFW Rules

Network firewall policies let you define rules that leverage NGFW capabilities. These rules can reference security profiles for deep inspection.

```bash
# Create a network firewall policy
gcloud compute network-firewall-policies create prod-ngfw-policy \
  --global \
  --description="Production NGFW policy with threat prevention" \
  --project=my-network-project

# Add a rule that inspects all inbound traffic with the threat prevention profile
gcloud compute network-firewall-policies rules create 1000 \
  --firewall-policy=prod-ngfw-policy \
  --direction=INGRESS \
  --action=apply_security_profile_group \
  --security-profile-group=organizations/123456789/locations/global/securityProfileGroups/prod-security-group \
  --src-ip-ranges=0.0.0.0/0 \
  --layer4-configs=tcp:80,tcp:443,tcp:8080 \
  --description="Inspect inbound web traffic for threats" \
  --global-firewall-policy \
  --project=my-network-project

# Add a rule using threat intelligence to block known malicious sources
gcloud compute network-firewall-policies rules create 900 \
  --firewall-policy=prod-ngfw-policy \
  --direction=INGRESS \
  --action=deny \
  --src-threat-intelligences=iplist-known-malicious-ips \
  --layer4-configs=all \
  --description="Block traffic from known malicious IPs" \
  --global-firewall-policy \
  --project=my-network-project

# Associate the policy with the VPC network
gcloud compute network-firewall-policies associations create \
  --firewall-policy=prod-ngfw-policy \
  --network=prod-vpc \
  --name=prod-vpc-association \
  --global-firewall-policy \
  --project=my-network-project
```

## Configuring TLS Inspection

TLS inspection allows the NGFW to decrypt encrypted traffic, inspect it for threats, and then re-encrypt it. This is essential because most modern traffic is encrypted and would otherwise bypass inspection.

### Step 1: Create a Certificate Authority

TLS inspection requires a CA certificate that the NGFW uses to re-sign decrypted traffic.

```bash
# Create a CA pool for TLS inspection
gcloud privateca pools create ngfw-ca-pool \
  --location=us-central1 \
  --project=my-network-project

# Create a root CA in the pool
gcloud privateca roots create ngfw-root-ca \
  --pool=ngfw-ca-pool \
  --location=us-central1 \
  --subject="CN=NGFW Inspection CA, O=My Organization" \
  --key-algorithm=ec-p256-sha256 \
  --max-chain-length=1 \
  --project=my-network-project
```

### Step 2: Create a TLS Inspection Policy

```bash
# Create the TLS inspection policy
gcloud network-security tls-inspection-policies create prod-tls-policy \
  --ca-pool=projects/my-network-project/locations/us-central1/caPools/ngfw-ca-pool \
  --location=global \
  --description="TLS inspection policy for production traffic" \
  --project=my-network-project
```

### Step 3: Exclude Sensitive Domains

Some traffic should not be decrypted - banking sites, healthcare portals, or domains where certificate pinning would break.

```bash
# Add a rule to bypass TLS inspection for sensitive domains
gcloud compute network-firewall-policies rules create 800 \
  --firewall-policy=prod-ngfw-policy \
  --direction=EGRESS \
  --action=allow \
  --dest-fqdns="*.bank.com,*.healthcare.gov,*.irs.gov" \
  --layer4-configs=tcp:443 \
  --description="Bypass TLS inspection for sensitive financial and healthcare domains" \
  --global-firewall-policy \
  --project=my-network-project
```

## Terraform Configuration

Here is a Terraform setup for a complete Cloud NGFW deployment.

```hcl
# Firewall endpoint for NGFW inspection
resource "google_network_security_firewall_endpoint" "main" {
  name               = "ngfw-endpoint"
  parent             = "organizations/123456789"
  location           = "us-central1-a"
  billing_project_id = "my-network-project"
}

# Security profile for threat prevention
resource "google_network_security_security_profile" "threat_prevention" {
  name        = "prod-threat-profile"
  parent      = "organizations/123456789"
  location    = "global"
  type        = "THREAT_PREVENTION"
  description = "Production threat prevention profile"
}

# Security profile group
resource "google_network_security_security_profile_group" "prod" {
  name                      = "prod-security-group"
  parent                    = "organizations/123456789"
  location                  = "global"
  threat_prevention_profile = google_network_security_security_profile.threat_prevention.id
  description               = "Production security profile group"
}

# Firewall endpoint association with VPC
resource "google_network_security_firewall_endpoint_association" "prod" {
  name              = "prod-association"
  parent            = "projects/my-network-project"
  location          = "us-central1-a"
  firewall_endpoint = google_network_security_firewall_endpoint.main.id
  network           = google_compute_network.prod.id
}

# Network firewall policy
resource "google_compute_network_firewall_policy" "prod" {
  name        = "prod-ngfw-policy"
  project     = "my-network-project"
  description = "Production NGFW policy"
}

# Inspect inbound web traffic
resource "google_compute_network_firewall_policy_rule" "inspect_inbound" {
  firewall_policy = google_compute_network_firewall_policy.prod.name
  project         = "my-network-project"
  priority        = 1000
  direction       = "INGRESS"
  action          = "apply_security_profile_group"

  security_profile_group = google_network_security_security_profile_group.prod.id

  match {
    src_ip_ranges = ["0.0.0.0/0"]
    layer4_configs {
      ip_protocol = "tcp"
      ports       = ["80", "443", "8080"]
    }
  }
}
```

## Monitoring NGFW Activity

Monitor Cloud NGFW through Cloud Logging to track blocked threats and inspection activity.

```bash
# View recent threat detections
gcloud logging read 'resource.type="networksecurity.googleapis.com/FirewallEndpoint" AND jsonPayload.threatType!=""' \
  --project=my-network-project \
  --limit=20 \
  --format="table(timestamp, jsonPayload.threatType, jsonPayload.threatId, jsonPayload.action, jsonPayload.srcIp, jsonPayload.destIp)"
```

Cloud NGFW brings enterprise-grade network security to Google Cloud without the operational burden of managing virtual appliances. The combination of IPS, TLS inspection, and threat intelligence integration gives you deep visibility and protection at the network layer, complementing your application-level security controls.
