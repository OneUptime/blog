# How to Configure Cloud Load Balancing for IPv4 in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Load Balancing, IPv4, HTTP, Networking, Compute Engine

Description: Configure GCP external HTTP(S) Load Balancing with global anycast IPv4 frontend, URL map, backend service, and health checks to distribute traffic across Compute Engine instances.

## Introduction

Global external HTTP(S) load balancing in GCP is global and anycast-based. A global external HTTP(S) load balancer uses a global static IP, can distribute traffic to backends across multiple regions, and provides SSL termination, CDN integration, and Cloud Armor security policies.

## Architecture

```text
Client
  ↓ (anycast global IP)
Forwarding Rule (frontend)
  ↓
Target HTTP(S) Proxy
  ↓
URL Map (routing rules)
  ↓
Backend Service
  ↓
Instance Groups (VMs in multiple zones or regions)
```

## Step 1: Create Instance Group Backends

```bash
PROJECT_ID="my-gcp-project"

# Create a managed instance group

gcloud compute instance-groups managed create web-ig \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --template=web-vm-template \
  --size=2

# Set named port for HTTP
gcloud compute instance-groups managed set-named-ports web-ig \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --named-ports=http:80
```

Make sure your backend VMs allow ingress from `35.191.0.0/16` and `130.211.0.0/22` to TCP port `80`, or health checks and GFE proxy traffic won't reach the backends.

## Step 2: Create a Health Check

```bash
gcloud compute health-checks create http http-health-check \
  --project=$PROJECT_ID \
  --port=80 \
  --request-path=/health \
  --check-interval=10s \
  --timeout=5s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3 \
  --global
```

## Step 3: Create the Backend Service

```bash
gcloud compute backend-services create web-backend \
  --project=$PROJECT_ID \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=http-health-check \
  --global

# Add the instance group as a backend
gcloud compute backend-services add-backend web-backend \
  --project=$PROJECT_ID \
  --instance-group=web-ig \
  --instance-group-zone=us-central1-a \
  --balancing-mode=UTILIZATION \
  --max-utilization=0.8 \
  --global
```

## Step 4: Create the URL Map

```bash
gcloud compute url-maps create web-url-map \
  --project=$PROJECT_ID \
  --default-service=web-backend \
  --global
```

## Step 5: Create HTTP Target Proxy

```bash
gcloud compute target-http-proxies create web-http-proxy \
  --project=$PROJECT_ID \
  --url-map=web-url-map \
  --global
```

## Step 6: Reserve Global Static IP and Create Forwarding Rule

```bash
# Reserve global static IP
gcloud compute addresses create web-lb-ip \
  --project=$PROJECT_ID \
  --ip-version=IPV4 \
  --network-tier=PREMIUM \
  --global

# Create forwarding rule
gcloud compute forwarding-rules create web-forwarding-rule \
  --project=$PROJECT_ID \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --network-tier=PREMIUM \
  --address=web-lb-ip \
  --global \
  --target-http-proxy=web-http-proxy \
  --ports=80

# Get the IP
gcloud compute addresses describe web-lb-ip \
  --project=$PROJECT_ID \
  --global \
  --format="get(address)"
```

## Adding HTTPS with SSL Certificate

```bash
# Public DNS A record for www.example.com must point to web-lb-ip for the managed certificate to become ACTIVE

# Create managed SSL certificate (auto-renews)
gcloud compute ssl-certificates create web-ssl-cert \
  --project=$PROJECT_ID \
  --domains=www.example.com \
  --global

# Create HTTPS target proxy
gcloud compute target-https-proxies create web-https-proxy \
  --project=$PROJECT_ID \
  --url-map=web-url-map \
  --ssl-certificates=web-ssl-cert \
  --global

# Add HTTPS forwarding rule
gcloud compute forwarding-rules create web-https-rule \
  --project=$PROJECT_ID \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --network-tier=PREMIUM \
  --address=web-lb-ip \
  --global \
  --target-https-proxy=web-https-proxy \
  --ports=443
```

## Checking Backend Health

```bash
gcloud compute backend-services get-health web-backend \
  --project=$PROJECT_ID \
  --global
```

## Conclusion

Global external HTTP(S) Load Balancing uses a single anycast IP to route traffic to healthy backends. Build the chain: health check → backend service → instance groups → URL map → target proxy → forwarding rule. Use managed SSL certificates for automatic certificate provisioning and renewal. Add Cloud Armor security policies to the backend service for DDoS protection and WAF rules.
