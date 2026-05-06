# How to Configure AWS Application Load Balancer for IPv4 Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, ALB, Application Load Balancer, IPv4, Load Balancing, Target Groups

Description: Create and configure an AWS Application Load Balancer with IPv4 target groups, listeners, health checks, and routing rules to distribute HTTP/HTTPS traffic across EC2 instances.

## Introduction

AWS Application Load Balancer (ALB) operates at Layer 7 (HTTP/HTTPS). It supports path-based and host-based routing, WebSockets, HTTP/2, and can route to EC2 instances, IP addresses, Lambda functions, or containers. Target groups define the backend servers.

## Step 1: Create the Target Group

```bash
VPC_ID="vpc-0123456789abcdef0"

# Create an IPv4 target group

TG_ARN=$(aws elbv2 create-target-group \
  --name web-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id $VPC_ID \
  --target-type instance \
  --ip-address-type ipv4 \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)
```

## Step 2: Register EC2 Instances as Targets

```bash
# Register instances in the target group; ALB uses their primary private IPv4 addresses
aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=i-0123456789abcdef0,Port=80 \
            Id=i-0fedcba9876543210,Port=80
```

## Step 3: Create the ALB

```bash
SUBNET1="subnet-0123456789abcdef0"
SUBNET2="subnet-0fedcba9876543210"
SG_ID="sg-0123456789abcdef0"

ALB_ARN=$(aws elbv2 create-load-balancer \
  --name my-alb \
  --subnets $SUBNET1 $SUBNET2 \
  --security-groups $SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get the DNS name
aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

## Step 4: Create an HTTP Listener

```bash
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)
```

## Adding Path-Based Routing Rules

```bash
# Create a second target group for API
API_TG_ARN=$(aws elbv2 create-target-group \
  --name api-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id $VPC_ID \
  --target-type instance \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Add a rule: /api/* → api-tg
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$API_TG_ARN
```

## Adding HTTPS Listener with ACM Certificate

```bash
# ACM certificate ARN in the same Region as the ALB
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

## Checking Target Health

```bash
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --query 'TargetHealthDescriptions[].{Target:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table
```

## Enabling Access Logs

```bash
# Requires an S3 bucket in the same Region with a bucket policy that allows
# Elastic Load Balancing to write access logs.
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes \
    Key=access_logs.s3.enabled,Value=true \
    Key=access_logs.s3.bucket,Value=my-alb-logs-bucket \
    Key=access_logs.s3.prefix,Value=my-alb
```

## Conclusion

ALB requires a target group, the ALB itself, and a listener. Register instances with `aws elbv2 register-targets`. Add path-based routing rules with `aws elbv2 create-rule` using path-pattern or host-header conditions. Use ACM certificates for HTTPS. Monitor target health with `describe-target-health` and enable S3 access logging for traffic analysis.
