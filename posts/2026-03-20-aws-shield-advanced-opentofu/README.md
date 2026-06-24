# How to Set Up AWS Shield Advanced with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Shield Advanced, DDoS Protection, Route 53, CloudFront, Infrastructure as Code

Description: Learn how to configure AWS Shield Advanced with OpenTofu to protect applications against large DDoS attacks with automatic mitigation, cost protection, and 24/7 DDoS Response Team access.

## Introduction

AWS Shield Advanced provides enhanced DDoS protection beyond the free Shield Standard, including automatic mitigation for large volumetric attacks, near-real-time attack visibility, cost protection opportunities through Shield Advanced service credits, and access to the Shield Response Team (SRT) if you also have AWS Business or Enterprise Support. It protects CloudFront, Route 53, Elastic Load Balancing load balancers, Elastic IP addresses, and Global Accelerator resources. EC2 instances are protected through associated Elastic IP addresses.

## Prerequisites

- OpenTofu v1.6+
- AWS Shield Advanced subscription ($3,000/month plus data transfer out usage fees, with a 1-year commitment)
- AWS Business or Enterprise Support plan if you want Shield Response Team (SRT) assistance
- AWS credentials with Shield and IAM permissions

## Step 1: Enable Shield Advanced Subscription

```hcl
# Enable Shield Advanced for the account

resource "aws_shield_subscription" "main" {
  auto_renew = "ENABLED"  # or "DISABLED"
}
```

## Step 2: Protect Resources

```hcl
data "aws_caller_identity" "current" {}

# Protect an Application Load Balancer
resource "aws_shield_protection" "alb" {
  name         = "${var.project_name}-alb-protection"
  resource_arn = var.alb_arn

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name = "${var.project_name}-alb-protection"
  }
}

# Protect a CloudFront distribution
resource "aws_shield_protection" "cloudfront" {
  name         = "${var.project_name}-cloudfront-protection"
  resource_arn = var.cloudfront_distribution_arn

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name = "${var.project_name}-cloudfront-protection"
  }
}

# Protect a Route 53 hosted zone
resource "aws_shield_protection" "route53" {
  name         = "${var.project_name}-route53-protection"
  resource_arn = "arn:aws:route53:::hostedzone/${var.hosted_zone_id}"

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name = "${var.project_name}-route53-protection"
  }
}

# Protect an Elastic IP
resource "aws_shield_protection" "eip" {
  name         = "${var.project_name}-eip-protection"
  resource_arn = "arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:eip-allocation/${var.eip_allocation_id}"

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name = "${var.project_name}-eip-protection"
  }
}
```

## Step 3: Create Protection Group for Multiple Resources

```hcl
# Group all protected resources for aggregate attack detection
resource "aws_shield_protection_group" "web_tier" {
  depends_on = [
    aws_shield_protection.alb,
    aws_shield_protection.cloudfront
  ]

  protection_group_id = "${var.project_name}-web-tier"
  aggregation         = "MAX"    # Report the max attack volume across grouped resources
  pattern             = "ARBITRARY"

  members = [
    var.alb_arn,
    var.cloudfront_distribution_arn
  ]

  tags = {
    Name = "${var.project_name}-web-tier"
  }
}

# Auto-include all resources of a type
resource "aws_shield_protection_group" "all_cloudfront" {
  depends_on = [aws_shield_subscription.main]

  protection_group_id = "${var.project_name}-all-cloudfront"
  aggregation         = "SUM"
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "CLOUDFRONT_DISTRIBUTION"
}
```

## Step 4: Associate WAF Web ACL for L7 Protection

```hcl
# Associate WAF to enable Shield Advanced application layer protections
resource "aws_wafv2_web_acl_association" "shield" {
  resource_arn = var.alb_arn
  web_acl_arn  = var.waf_web_acl_arn
}

# Optional: authorize the Shield Response Team (SRT) to assist during attacks
resource "aws_shield_drt_access_role_arn_association" "main" {
  role_arn = aws_iam_role.shield_drt.arn

  depends_on = [
    aws_iam_role_policy_attachment.shield_drt,
    aws_shield_subscription.main
  ]
}

resource "aws_iam_role" "shield_drt" {
  name = "${var.project_name}-shield-drt-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "drt.shield.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "shield_drt" {
  role       = aws_iam_role.shield_drt.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSShieldDRTAccessPolicy"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# View protected resources
aws shield list-protections

# View attack summaries for a protected resource during a time window
aws shield list-attacks \
  --resource-arns arn:aws:cloudfront::123456789012:distribution/E1PXMP22ZVFAOR \
  --start-time FromInclusive=2026-03-19T00:00:00Z,ToExclusive=2026-03-20T00:00:00Z
```

## Conclusion

Shield Advanced is most compelling for internet-facing applications where a DDoS event could drive significant AWS spend, because AWS can provide Shield Advanced service credits for eligible attack-related charges when you meet its prerequisites. Protect all public-facing resources in protection groups to improve detection, associate AWS WAF web ACLs with protected ALBs or CloudFront distributions for application layer protection, and grant Shield Response Team access separately if you want hands-on assistance during attacks.
