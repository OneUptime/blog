# How to Set Up AWS Network Load Balancer with IPv4 Target Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, NLB, Network Load Balancer, IPv4, TCP, Target Groups

Description: Create an AWS Network Load Balancer with IPv4 target groups, TCP listeners, and health checks for high-performance Layer 4 load balancing of TCP and UDP traffic.

## Introduction

AWS Network Load Balancer (NLB) operates at Layer 4 (TCP/UDP/TLS). It handles millions of connections per second with ultra-low latency. NLB can preserve client source IP addresses, supports static Elastic IPs per AZ, and can be used for PrivateLink endpoint services.

## Step 1: Create the Target Group

```bash
VPC_ID="vpc-0abc123def4567890"

# TCP target group for web servers on port 80

TG_ARN=$(aws elbv2 create-target-group \
  --name nlb-web-tg \
  --protocol TCP \
  --port 80 \
  --vpc-id $VPC_ID \
  --target-type instance \
  --ip-address-type ipv4 \
  --health-check-protocol TCP \
  --health-check-port traffic-port \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 3 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=i-0abc123def4567890 Id=i-0123456789abcdef0
```

## Step 2: Create the NLB

```bash
SUBNET1="subnet-0abc123def4567890"
SUBNET2="subnet-0123456789abcdef0"

# Create an internet-facing NLB
NLB_ARN=$(aws elbv2 create-load-balancer \
  --name my-nlb \
  --subnets $SUBNET1 $SUBNET2 \
  --scheme internet-facing \
  --type network \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get NLB DNS name
aws elbv2 describe-load-balancers \
  --load-balancer-arns $NLB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

## Step 3: Create a TCP Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn $NLB_ARN \
  --protocol TCP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

## Using Elastic IPs for Static IP Per AZ

```bash
# Allocate Elastic IPs
EIP1=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
EIP2=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)

# Create NLB with static Elastic IPs per subnet/AZ
NLB_ARN=$(aws elbv2 create-load-balancer \
  --name my-nlb-static \
  --subnet-mappings \
    SubnetId=$SUBNET1,AllocationId=$EIP1 \
    SubnetId=$SUBNET2,AllocationId=$EIP2 \
  --scheme internet-facing \
  --type network \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)
```

## TLS Termination at NLB

```bash
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

aws elbv2 create-listener \
  --load-balancer-arn $NLB_ARN \
  --protocol TLS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

## IP Target Group (for containers or private off-VPC targets)

```bash
# Create IP-based target group
IP_TG_ARN=$(aws elbv2 create-target-group \
  --name nlb-ip-tg \
  --protocol TCP \
  --port 8080 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Register by IP address
aws elbv2 register-targets \
  --target-group-arn $IP_TG_ARN \
  --targets Id=10.0.1.10,Port=8080 Id=10.0.1.11,Port=8080
```

## Enabling Cross-Zone Load Balancing

```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $NLB_ARN \
  --attributes Key=load_balancing.cross_zone.enabled,Value=true
```

## Checking Target Health

```bash
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --output table
```

## NLB vs ALB

| Feature | NLB | ALB |
|---|---|---|
| Protocol | TCP/UDP/TLS | HTTP/HTTPS |
| Source IP preserved | Yes (target-type dependent) | No (uses X-Forwarded-For) |
| Static IP per AZ | Yes | No |
| Routing | By port | By path/host/header |
| Latency | Ultra-low | Higher due to Layer 7 routing |

## Conclusion

NLB is ideal for TCP/UDP protocols, source IP preservation, static IPs, and ultra-low latency. Use TCP target groups for general TCP, and TLS listeners for encrypted termination. Register targets by instance ID or IP. Enable cross-zone load balancing for even distribution when AZs have unequal instance counts.
