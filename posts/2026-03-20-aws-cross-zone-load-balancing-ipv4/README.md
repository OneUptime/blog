# How to Configure Cross-Zone Load Balancing for IPv4 in AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Load Balancing, ALB, NLB, IPv4, High Availability, Networking

Description: Enable cross-zone load balancing on AWS ALB and NLB to distribute IPv4 traffic evenly across targets in all availability zones, improving load distribution.

## Introduction

When cross-zone load balancing is off, a load balancer node distributes traffic only to targets in the same availability zone as the receiving load balancer node. Cross-zone load balancing allows a load balancer node in one AZ to forward requests to targets in any AZ, improving distribution when target counts differ per zone.

## Why Cross-Zone Matters

Without cross-zone load balancing, if you have 2 targets in us-east-1a and 8 targets in us-east-1b, each load balancer node sends 50% to its zone - meaning each us-east-1a target can get 4x more traffic per instance than us-east-1b targets.

With cross-zone enabled, traffic can be distributed more evenly across all 10 targets.

## Enabling Cross-Zone on an Application Load Balancer

At the load balancer level, cross-zone load balancing is **always enabled** and **cannot be changed** on ALBs. At the target group level, you can override the default by explicitly turning cross-zone load balancing off or on.

```bash
# Verify ALB cross-zone status

aws elbv2 describe-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123 \
  --query 'Attributes[?Key==`load_balancing.cross_zone.enabled`]'
```

## Enabling Cross-Zone on a Network Load Balancer

NLBs have cross-zone **disabled by default** at the load balancer level. Enable it explicitly:

```bash
# Enable cross-zone load balancing on an NLB
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/my-nlb/abc123 \
  --attributes Key=load_balancing.cross_zone.enabled,Value=true
```

## NLB Per-Target-Group Cross-Zone Override

NLB target groups default to the load balancer setting, but you can override it explicitly:

```bash
# Enable cross-zone at the target group level
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/abc123 \
  --attributes Key=load_balancing.cross_zone.enabled,Value=true
```

## Enabling via Terraform

```hcl
resource "aws_lb" "nlb" {
  name               = "my-nlb"
  load_balancer_type = "network"
  internal           = false
  subnets            = [aws_subnet.az1.id, aws_subnet.az2.id]

  enable_cross_zone_load_balancing = true   # Enable cross-zone on NLB
}
```

## Verifying Traffic Distribution

Use CloudWatch metrics such as `NewFlowCount` to verify traffic flow per AZ:

```bash
# Get NewFlowCount per AZ
aws cloudwatch get-metric-statistics \
  --namespace AWS/NetworkELB \
  --metric-name NewFlowCount \
  --dimensions \
    Name=LoadBalancer,Value=net/my-nlb/abc123 \
    Name=AvailabilityZone,Value=us-east-1a \
  --start-time 2026-03-19T00:00:00Z \
  --end-time 2026-03-19T01:00:00Z \
  --period 300 \
  --statistics Sum
```

## Cost Considerations

Enabling cross-zone on NLBs can incur **inter-AZ data transfer charges**. Evaluate whether the improved distribution justifies the cost based on your traffic patterns and current EC2 data transfer pricing in your Region.

## Conclusion

Cross-zone load balancing is useful for production deployments with unequal target counts across AZs. ALBs keep it enabled at the load balancer level, though target groups can override it; enable it on NLBs when traffic distribution matters more than inter-AZ data transfer costs.
