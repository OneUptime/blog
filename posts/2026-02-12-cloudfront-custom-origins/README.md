# How to Set Up CloudFront with Custom Origins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, CDN, Custom Origin

Description: Guide to configuring CloudFront with custom HTTP origins including ALBs, EC2 instances, and external servers with proper origin settings and security.

---

Not every CloudFront distribution uses S3 as its origin. When your content comes from an Application Load Balancer, an EC2 instance, or even a server running outside AWS entirely, you're working with custom origins. The configuration is different from S3 origins, and there are several important settings that affect performance, security, and reliability.

## What Counts as a Custom Origin

Any HTTP or HTTPS server that isn't an S3 bucket endpoint is a custom origin in CloudFront terminology. Common examples:

- Application Load Balancers (ALBs)
- EC2 instances with public IPs
- Elastic Beanstalk environments
- API Gateway endpoints
- On-premises web servers
- Third-party APIs or services

The key requirement is that the origin must be reachable via HTTP or HTTPS on a public DNS name. CloudFront can't reach private IP addresses directly.

## Basic Custom Origin Configuration

Here's a distribution configuration with an ALB as a custom origin:

```json
{
  "CallerReference": "custom-origin-001",
  "Comment": "Distribution with ALB custom origin",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "alb-origin",
        "DomainName": "my-alb-123456.us-east-1.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        },
        "CustomHeaders": {
          "Quantity": 1,
          "Items": [
            {
              "HeaderName": "X-Custom-Origin-Secret",
              "HeaderValue": "my-secret-value-12345"
            }
          ]
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "alb-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
    "CachedMethods": ["GET", "HEAD"],
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
    "Compress": true
  },
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
```

```bash
# Create the distribution
aws cloudfront create-distribution \
  --distribution-config file://custom-origin-dist.json
```

## Origin Protocol Policy

This setting controls how CloudFront connects to your origin:

- **http-only** - CloudFront connects via HTTP only. Use when your origin doesn't support HTTPS.
- **https-only** - CloudFront connects via HTTPS only. Use for production workloads.
- **match-viewer** - CloudFront uses the same protocol the viewer used. If the viewer connected via HTTPS, CloudFront connects to the origin via HTTPS.

For production, always use `https-only` when possible. Even though the connection between CloudFront and your origin is over AWS's internal network (for AWS origins), encrypting that traffic is a best practice.

## Origin Timeouts

Two timeout settings matter:

```json
{
  "OriginReadTimeout": 30,
  "OriginKeepaliveTimeout": 5
}
```

**OriginReadTimeout** (1-180 seconds) is how long CloudFront waits for a response from the origin. If your backend is slow, increase this. The default is 30 seconds.

**OriginKeepaliveTimeout** (1-180 seconds) controls how long CloudFront keeps idle connections open to the origin. Higher values reduce the overhead of establishing new connections but consume more origin resources.

For APIs that might take a while to process:

```json
{
  "OriginReadTimeout": 60,
  "OriginKeepaliveTimeout": 30
}
```

## Securing Custom Origins

Unlike S3 with OAC, custom origins need different security approaches. The goal is to ensure users can only access your origin through CloudFront, not directly.

### Method 1: Custom Header Verification

Add a secret header in CloudFront that your origin validates:

```json
{
  "CustomHeaders": {
    "Quantity": 1,
    "Items": [
      {
        "HeaderName": "X-Origin-Verify",
        "HeaderValue": "a8f5f167f44f4964e6c998dee827110c"
      }
    ]
  }
}
```

On your origin (for example, in an NGINX config):

```nginx
# Reject requests that don't come through CloudFront
server {
    listen 443 ssl;
    server_name origin.example.com;

    # Check for the CloudFront custom header
    if ($http_x_origin_verify != "a8f5f167f44f4964e6c998dee827110c") {
        return 403;
    }

    location / {
        proxy_pass http://backend;
    }
}
```

### Method 2: AWS WAF on the ALB

If your origin is an ALB, you can use AWS WAF to restrict access:

```bash
# Create a WAF rule that checks for CloudFront's custom header
aws wafv2 create-web-acl \
  --name "cloudfront-only" \
  --scope REGIONAL \
  --default-action '{"Block":{}}' \
  --visibility-config '{
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "cloudfront-only"
  }' \
  --rules '[{
    "Name": "allow-cloudfront",
    "Priority": 1,
    "Action": {"Allow": {}},
    "Statement": {
      "ByteMatchStatement": {
        "FieldToMatch": {"SingleHeader": {"Name": "x-origin-verify"}},
        "PositionalConstraint": "EXACTLY",
        "SearchString": "a8f5f167f44f4964e6c998dee827110c",
        "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
      }
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "allow-cloudfront"
    }
  }]'
```

### Method 3: CloudFront Managed Prefix List

AWS publishes a managed prefix list containing all CloudFront IP ranges. Use it in your security group:

```bash
# Get the CloudFront managed prefix list ID
aws ec2 describe-managed-prefix-lists \
  --filters "Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing" \
  --query 'PrefixLists[0].PrefixListId'

# Add it to your ALB's security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-abc123 \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 443,
    "ToPort": 443,
    "PrefixListIds": [{"PrefixListId": "pl-3b927c52"}]
  }]'
```

This restricts the ALB to only accept connections from CloudFront IP addresses. Combine this with Method 1 for defense in depth.

## Using an External Server as Origin

You can use any publicly accessible HTTP server as a CloudFront origin. This is useful for migrating to AWS gradually or for hybrid architectures:

```json
{
  "Id": "external-origin",
  "DomainName": "origin.mycompany.com",
  "CustomOriginConfig": {
    "HTTPPort": 80,
    "HTTPSPort": 443,
    "OriginProtocolPolicy": "https-only",
    "OriginSslProtocols": {
      "Quantity": 2,
      "Items": ["TLSv1.2", "TLSv1.1"]
    },
    "OriginReadTimeout": 60,
    "OriginKeepaliveTimeout": 5
  }
}
```

Make sure the SSL certificate on your external server is valid and trusted. CloudFront validates the certificate chain just like a browser would.

## Origin Path

If your content lives in a subdirectory on the origin, use the origin path to avoid repeating it in every URL:

```json
{
  "Id": "api-v2-origin",
  "DomainName": "api.example.com",
  "OriginPath": "/v2",
  "CustomOriginConfig": {
    "HTTPPort": 80,
    "HTTPSPort": 443,
    "OriginProtocolPolicy": "https-only"
  }
}
```

A request to `https://cdn.example.com/users` becomes a request to `https://api.example.com/v2/users` at the origin.

## Connection Attempts and Failover

CloudFront lets you configure how many times it tries to connect to an origin:

```json
{
  "ConnectionAttempts": 3,
  "ConnectionTimeout": 10
}
```

**ConnectionAttempts** (1-3) is how many times CloudFront tries to connect. **ConnectionTimeout** (1-10 seconds) is how long each attempt waits.

For high availability, pair this with origin groups for automatic failover. Check our guide on [CloudFront origin failover](https://oneuptime.com/blog/post/2026-02-12-cloudfront-origin-failover-high-availability/view) for the full setup.

## Monitoring Custom Origins

Custom origins need monitoring on both the CloudFront side and the origin side. CloudFront metrics in CloudWatch show you error rates and latency from the edge. Your origin's own monitoring shows you what's happening behind CloudFront.

Key metrics to watch:

- **OriginLatency** - How long the origin takes to respond
- **5xxErrorRate** - Server errors from the origin
- **4xxErrorRate** - Client errors (could indicate misconfiguration)

```bash
# Check origin latency over the last hour
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name OriginLatency \
  --dimensions Name=DistributionId,Value=E1234567890 Name=Region,Value=Global \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,p99
```

## Summary

Custom origins in CloudFront handle any HTTP/HTTPS server that isn't an S3 endpoint. The critical configuration points are the origin protocol policy (use HTTPS in production), timeouts (increase for slow backends), and security (use custom headers plus prefix lists to restrict origin access to CloudFront only). Whether your origin is an ALB, EC2 instance, or external server, the setup follows the same pattern. Just make sure the domain name resolves publicly and the origin responds correctly on the configured ports.
