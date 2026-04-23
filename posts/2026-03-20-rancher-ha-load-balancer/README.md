# How to Configure Rancher HA with External Load Balancer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Load Balancer, Networking

Description: Configure an external load balancer for Rancher HA to distribute traffic across multiple Rancher server nodes and provide health check-based failover.

## Introduction

An external load balancer is the entry point for all Rancher traffic in an HA configuration. It distributes incoming requests across healthy Rancher instances and provides automatic failover when nodes fail. This guide covers configuring AWS ALB/NLB, GCP Load Balancer, and software load balancers for Rancher HA.

## Prerequisites

- Running Rancher HA cluster (RKE2 or K3s)
- Multiple Rancher server nodes
- Access to cloud provider or software load balancer
- TLS certificate for Rancher hostname
- If terminating TLS at a Layer 7 load balancer, Rancher installed with `--set tls=external`

## Step 1: AWS Application Load Balancer

```bash
# Create target group for Rancher HTTP when terminating TLS at the ALB
# Rancher should be installed with --set tls=external in this case

aws elbv2 create-target-group \
  --name rancher-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxxxxx \
  --target-type instance \
  --health-check-protocol HTTP \
  --health-check-path /healthz \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:...target-group/rancher-tg/... \
  --targets \
    Id=i-rke2-server-01,Port=80 \
    Id=i-rke2-server-02,Port=80 \
    Id=i-rke2-server-03,Port=80

# Create ALB
aws elbv2 create-load-balancer \
  --name rancher-alb \
  --type application \
  --scheme internet-facing \
  --subnets subnet-az1 subnet-az2 subnet-az3 \
  --security-groups sg-rancher-lb

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:.../rancher-alb/... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:.../certificate/... \
  --default-actions Type=forward,TargetGroupArn=arn:...rancher-tg/...

# Add HTTP redirect
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:.../rancher-alb/... \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]'
```

## Step 2: AWS Network Load Balancer (for Layer 4 TCP Pass-through)

```bash
# NLB is a good fit when you want TCP pass-through to Rancher
aws elbv2 create-load-balancer \
  --name rancher-nlb \
  --type network \
  --scheme internet-facing \
  --subnets subnet-az1 subnet-az2 subnet-az3

# Create TCP target group for Rancher HTTPS
aws elbv2 create-target-group \
  --name rancher-tcp-443 \
  --protocol TCP \
  --port 443 \
  --vpc-id vpc-xxxxxxxx \
  --target-type instance \
  --health-check-protocol TCP \
  --health-check-port 80 \
  --health-check-interval-seconds 10

# Register Rancher targets
aws elbv2 register-targets \
  --target-group-arn arn:.../rancher-tcp-443/... \
  --targets \
    Id=i-rke2-server-01,Port=443 \
    Id=i-rke2-server-02,Port=443 \
    Id=i-rke2-server-03,Port=443

# NLB passes through SSL to Rancher nodes (SSL termination at Rancher)
aws elbv2 create-listener \
  --load-balancer-arn arn:.../rancher-nlb/... \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=arn:.../rancher-tcp-443/...

# Optional HTTP listener; Rancher ingress redirects 80 to 443
aws elbv2 create-target-group \
  --name rancher-tcp-80 \
  --protocol TCP \
  --port 80 \
  --vpc-id vpc-xxxxxxxx \
  --target-type instance \
  --health-check-protocol TCP \
  --health-check-interval-seconds 10

aws elbv2 register-targets \
  --target-group-arn arn:.../rancher-tcp-80/... \
  --targets \
    Id=i-rke2-server-01,Port=80 \
    Id=i-rke2-server-02,Port=80 \
    Id=i-rke2-server-03,Port=80

aws elbv2 create-listener \
  --load-balancer-arn arn:.../rancher-nlb/... \
  --protocol TCP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:.../rancher-tcp-80/...
```

## Step 3: GCP Load Balancer Configuration

```bash
# Create health check
gcloud compute health-checks create http rancher-health-check \
  --port=80 \
  --request-path=/healthz \
  --check-interval=10s \
  --timeout=5s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3 \
  --global

# Create backend service for Rancher
gcloud compute backend-services create rancher-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=rancher-health-check \
  --global

# Add instance group to backend
gcloud compute backend-services add-backend rancher-backend \
  --instance-group=rancher-server-group \
  --instance-group-zone=us-central1-a \
  --global

# Create URL map and forwarding rule
gcloud compute url-maps create rancher-url-map \
  --default-service=rancher-backend

gcloud compute target-https-proxies create rancher-https-proxy \
  --url-map=rancher-url-map \
  --ssl-certificates=rancher-ssl-cert \
  --global

gcloud compute forwarding-rules create rancher-forwarding-rule \
  --target-https-proxy=rancher-https-proxy \
  --ports=443 \
  --global
```

## Step 4: Session Persistence Configuration

```bash
# Session affinity is optional for Rancher HA
# Enable it only if your environment requires sticky sessions

# AWS ALB - enable session stickiness
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:.../rancher-tg/... \
  --attributes \
    Key=stickiness.enabled,Value=true \
    Key=stickiness.type,Value=lb_cookie \
    Key=stickiness.lb_cookie.duration_seconds,Value=86400
```

## Step 5: Health Check Configuration

```bash
# Rancher health endpoint
curl -sk https://rancher.example.com/healthz
# Returns: HTTP 200

# Configure health checks to use /healthz
# For K3s clusters using Traefik, /ping is the ingress health path

curl -sk https://rancher.example.com/ping
# Returns: pong
```

## Step 6: WebSocket Timeout Configuration

```bash
# Rancher cluster agents use long-lived WebSocket connections
# Configure load balancer for long timeouts

# AWS ALB - idle timeout
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:.../rancher-alb/... \
  --attributes Key=idle_timeout.timeout_seconds,Value=3600

# GCP - backend timeout
gcloud compute backend-services update rancher-backend \
  --timeout=3600s \
  --global
```

## Step 7: DNS Configuration

```bash
# Create DNS record pointing to load balancer
# AWS Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id XXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "rancher.example.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "rancher-nlb-xxx.elb.amazonaws.com"}]
      }
    }]
  }'
```

## Conclusion

A properly configured load balancer is essential for Rancher HA's reliability and performance. Rancher generally recommends a Layer 4 load balancer forwarding TCP/80 and TCP/443 to the management cluster nodes, while ALB or a Google HTTPS load balancer is a valid choice when you intentionally terminate TLS at the load balancer and install Rancher with `--set tls=external`. ALB already supports WebSocket connections; choose NLB when you want simple TCP pass-through to Rancher. Configure generous timeouts to prevent premature connection termination, use `/healthz` for Rancher health checks, and reserve `/ping` for K3s/Traefik ingress health checks. For production deployments, test failover behavior by temporarily removing nodes from the target group to verify traffic shifts correctly.
