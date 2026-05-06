# How to Configure GCP External HTTP(S) Load Balancer for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancing, HTTP, IPv4, Global, Backend Service

Description: Configure GCP External HTTP(S) Load Balancer with a global anycast IPv4 address, backend service, URL map, and managed SSL certificate for distributing web traffic globally.

## Introduction

GCP External HTTP(S) Load Balancer is a global, anycast Layer 7 load balancer. It uses a single global IP that routes to the nearest healthy backend. The configuration chain is: forwarding rule → target proxy → URL map → backend service → instance groups.

## Prerequisites: Backend VM Instance Group

```bash
PROJECT_ID="my-gcp-project"
ZONE="us-central1-a"
NETWORK="default"

# Create a VM template

gcloud compute instance-templates create web-template \
  --project=$PROJECT_ID \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --network=$NETWORK \
  --tags=http-server \
  --metadata=startup-script='#!/bin/bash
apt-get install -y nginx
echo "server $(hostname)" > /var/www/html/index.html'

# Create managed instance group
gcloud compute instance-groups managed create web-mig \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --template=web-template \
  --size=2

gcloud compute instance-groups managed set-named-ports web-mig \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --named-ports=http:80
```

## Step 1: Create a Health Check

```bash
gcloud compute health-checks create http web-health-check \
  --project=$PROJECT_ID \
  --port=80 \
  --request-path=/index.html \
  --check-interval=10s \
  --timeout=5s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3 \
  --global
```

## Step 2: Create Backend Service

```bash
gcloud compute backend-services create web-backend \
  --project=$PROJECT_ID \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=web-health-check \
  --global \
  --enable-cdn

gcloud compute backend-services add-backend web-backend \
  --project=$PROJECT_ID \
  --instance-group=web-mig \
  --instance-group-zone=$ZONE \
  --global
```

## Step 3: Create URL Map

```bash
gcloud compute url-maps create web-map \
  --project=$PROJECT_ID \
  --default-service=web-backend \
  --global
```

## Step 4: Managed SSL Certificate

```bash
gcloud compute ssl-certificates create web-cert \
  --project=$PROJECT_ID \
  --domains=www.example.com \
  --global
```

## Step 5: Target HTTPS Proxy

```bash
gcloud compute target-https-proxies create web-proxy \
  --project=$PROJECT_ID \
  --url-map=web-map \
  --ssl-certificates=web-cert \
  --global
```

## Step 6: Global Static IP and Forwarding Rules

```bash
gcloud compute addresses create web-ip \
  --project=$PROJECT_ID \
  --ip-version=IPV4 \
  --network-tier=PREMIUM \
  --global

gcloud compute forwarding-rules create web-rule \
  --project=$PROJECT_ID \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address=web-ip \
  --network-tier=PREMIUM \
  --global \
  --target-https-proxy=web-proxy \
  --ports=443

# Also redirect HTTP to HTTPS
cat > /tmp/web-map-http.yaml <<'EOF'
kind: compute#urlMap
name: web-map-http
defaultUrlRedirect:
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  httpsRedirect: True
tests:
- description: Test HTTP to HTTPS redirect
  host: www.example.com
  path: /
  expectedOutputUrl: https://www.example.com/
  expectedRedirectResponseCode: 301
EOF

gcloud compute url-maps validate \
  --source=/tmp/web-map-http.yaml \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --global

gcloud compute url-maps import web-map-http \
  --project=$PROJECT_ID \
  --source=/tmp/web-map-http.yaml \
  --global

gcloud compute target-http-proxies create web-http-proxy \
  --project=$PROJECT_ID \
  --url-map=web-map-http \
  --global

gcloud compute forwarding-rules create web-http-rule \
  --project=$PROJECT_ID \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address=web-ip \
  --network-tier=PREMIUM \
  --global \
  --target-http-proxy=web-http-proxy \
  --ports=80

# Get the IP
gcloud compute addresses describe web-ip --project=$PROJECT_ID --global --format="get(address)"
```

## Step 7: Allow Load Balancer and Health Check Traffic

```bash
# Allow load balancer proxies and health checks from Google's source ranges
gcloud compute firewall-rules create allow-health-checks \
  --project=$PROJECT_ID \
  --network=$NETWORK \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:80 \
  --source-ranges=130.211.0.0/22,35.191.0.0/16 \
  --target-tags=http-server
```

## Checking Backend Health

```bash
gcloud compute backend-services get-health web-backend \
  --project=$PROJECT_ID \
  --global
```

## Conclusion

GCP's global HTTP(S) LB routes to the nearest healthy backend using anycast. Build the chain from backend service to forwarding rule. Enable Cloud CDN at the backend service level with `--enable-cdn`. Allow load balancer and health check traffic from `130.211.0.0/22` and `35.191.0.0/16` to the backend port. Managed SSL certificates auto-renew when the domain's DNS records keep pointing to the load balancer and certificate validation continues to succeed.
