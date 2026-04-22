# How to Set Up a Cloud VPN for IPv4 Connectivity in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud VPN, IPv4, Site-to-Site, Hybrid Connectivity, IPsec

Description: Configure GCP Cloud VPN to create an IPSec VPN tunnel between a GCP VPC and an on-premises IPv4 network, using both Classic VPN and HA VPN options.

## Introduction

GCP Cloud VPN creates encrypted IPSec tunnels between your GCP VPC and on-premises networks or other cloud VPCs. HA VPN provides 99.99% SLA with two external IPs and automatic failover. Classic VPN uses a single external IP with 99.9% SLA.

## Option 1: HA VPN (Recommended)

HA VPN uses BGP for dynamic routing and requires two tunnels for redundancy.

### Step 1: Create a Cloud Router

```bash
PROJECT_ID="my-gcp-project"
REGION="us-central1"

gcloud compute routers create prod-router \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --region=$REGION \
  --asn=65001
```

### Step 2: Create the HA VPN Gateway

```bash
gcloud compute vpn-gateways create ha-vpn-gw \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --region=$REGION

# View the two external IPs assigned

gcloud compute vpn-gateways describe ha-vpn-gw \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(vpnInterfaces)"
```

### Step 3: Create the Peer VPN Gateway

```bash
# Define on-premises gateway with its two external IPs
gcloud compute external-vpn-gateways create onprem-peer-gw \
  --project=$PROJECT_ID \
  --interfaces 0=203.0.113.1,1=203.0.113.2
```

### Step 4: Create VPN Tunnels (Two for HA)

```bash
# Tunnel 0: GCP interface 0 → On-premises interface 0
gcloud compute vpn-tunnels create tunnel-0 \
  --project=$PROJECT_ID \
  --region=$REGION \
  --vpn-gateway=ha-vpn-gw \
  --interface=0 \
  --peer-external-gateway=onprem-peer-gw \
  --peer-external-gateway-interface=0 \
  --shared-secret="MyVPNSecret123!" \
  --router=prod-router \
  --ike-version=2

# Tunnel 1: GCP interface 1 → On-premises interface 1
gcloud compute vpn-tunnels create tunnel-1 \
  --project=$PROJECT_ID \
  --region=$REGION \
  --vpn-gateway=ha-vpn-gw \
  --interface=1 \
  --peer-external-gateway=onprem-peer-gw \
  --peer-external-gateway-interface=1 \
  --shared-secret="MyVPNSecret123!" \
  --router=prod-router \
  --ike-version=2
```

### Step 5: Configure BGP Sessions on Cloud Router

```bash
# BGP for tunnel 0
gcloud compute routers add-interface prod-router \
  --project=$PROJECT_ID \
  --region=$REGION \
  --interface-name=if-tunnel-0 \
  --ip-address=169.254.0.1 \
  --mask-length=30 \
  --vpn-tunnel=tunnel-0

gcloud compute routers add-bgp-peer prod-router \
  --project=$PROJECT_ID \
  --region=$REGION \
  --peer-name=bgp-peer-0 \
  --interface=if-tunnel-0 \
  --peer-ip-address=169.254.0.2 \
  --peer-asn=65002

# BGP for tunnel 1 (repeat with different link-local IPs)
gcloud compute routers add-interface prod-router \
  --project=$PROJECT_ID \
  --region=$REGION \
  --interface-name=if-tunnel-1 \
  --ip-address=169.254.1.1 \
  --mask-length=30 \
  --vpn-tunnel=tunnel-1

gcloud compute routers add-bgp-peer prod-router \
  --project=$PROJECT_ID \
  --region=$REGION \
  --peer-name=bgp-peer-1 \
  --interface=if-tunnel-1 \
  --peer-ip-address=169.254.1.2 \
  --peer-asn=65002
```

## Checking Tunnel Status

```bash
# View tunnel status
gcloud compute vpn-tunnels list \
  --project=$PROJECT_ID \
  --regions=$REGION \
  --format="table(name, status, detailedStatus)"

# View BGP session status
gcloud compute routers get-status prod-router \
  --project=$PROJECT_ID \
  --region=$REGION
```

## Option 2: Classic VPN (Single IP)

For simpler setups with policy-based routing:

```bash
# Create Classic VPN gateway
gcloud compute target-vpn-gateways create classic-vpn-gw \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --region=$REGION

# Reserve external IP
gcloud compute addresses create vpn-ip --project=$PROJECT_ID --region=$REGION

# Forwarding rules (ESP, UDP 500, UDP 4500)
VPN_IP=$(gcloud compute addresses describe vpn-ip \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(address)")

gcloud compute forwarding-rules create vpn-esp \
  --project=$PROJECT_ID \
  --region=$REGION \
  --load-balancing-scheme=EXTERNAL \
  --network-tier=PREMIUM \
  --ip-protocol=ESP \
  --address=$VPN_IP \
  --target-vpn-gateway=classic-vpn-gw

gcloud compute forwarding-rules create vpn-udp500 \
  --project=$PROJECT_ID \
  --region=$REGION \
  --load-balancing-scheme=EXTERNAL \
  --network-tier=PREMIUM \
  --ip-protocol=UDP \
  --ports=500 \
  --address=$VPN_IP \
  --target-vpn-gateway=classic-vpn-gw

gcloud compute forwarding-rules create vpn-udp4500 \
  --project=$PROJECT_ID \
  --region=$REGION \
  --load-balancing-scheme=EXTERNAL \
  --network-tier=PREMIUM \
  --ip-protocol=UDP \
  --ports=4500 \
  --address=$VPN_IP \
  --target-vpn-gateway=classic-vpn-gw

# Create the policy-based tunnel and a static route to the peer network
ON_PREM_IP="203.0.113.1"
LOCAL_IP_RANGE="10.0.0.0/16"
REMOTE_IP_RANGE="192.168.0.0/16"

gcloud compute vpn-tunnels create classic-tunnel-0 \
  --project=$PROJECT_ID \
  --region=$REGION \
  --peer-address=$ON_PREM_IP \
  --ike-version=2 \
  --shared-secret="MyVPNSecret123!" \
  --local-traffic-selector=$LOCAL_IP_RANGE \
  --remote-traffic-selector=$REMOTE_IP_RANGE \
  --target-vpn-gateway=classic-vpn-gw

gcloud compute routes create route-to-onprem \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --destination-range=$REMOTE_IP_RANGE \
  --next-hop-vpn-tunnel=classic-tunnel-0 \
  --next-hop-vpn-tunnel-region=$REGION
```

## Conclusion

Use HA VPN with two tunnels and BGP for production workloads - it provides 99.99% SLA and automatic failover. Classic VPN is simpler but offers only 99.9% SLA with static routing. Use IKEv2 when your peer VPN gateway supports it. Monitor tunnel status with `gcloud compute vpn-tunnels list` and BGP sessions with `gcloud compute routers get-status`.
