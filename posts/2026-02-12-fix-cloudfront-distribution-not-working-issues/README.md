# How to Fix CloudFront 'Distribution Not Working' Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, CDN, Debugging, Networking

Description: Troubleshoot CloudFront distributions that are not serving content correctly, covering DNS issues, origin configuration, SSL certificates, and cache behavior problems.

---

Your CloudFront distribution is deployed, the status shows "Deployed," but something isn't right. Maybe requests aren't reaching your origin, you're getting errors, the wrong content is being served, or the distribution seems completely unresponsive. CloudFront issues can be tricky to debug because there are multiple layers between the user and your origin server.

Let's work through the most common problems systematically.

## Is the Distribution Actually Deployed?

First, confirm the distribution status:

```bash
# Check distribution status
aws cloudfront get-distribution --id E1234567890 \
    --query 'Distribution.{Status:Status,DomainName:DomainName,Enabled:DistributionConfig.Enabled}'
```

The status needs to be "Deployed" and Enabled must be true. If the status is "InProgress," changes are still propagating to CloudFront's edge locations. This can take 5-15 minutes.

## DNS Not Pointing to CloudFront

If you're using a custom domain, it must point to your CloudFront distribution's domain name:

```bash
# Check what your domain resolves to
dig app.example.com CNAME +short

# It should return something like d1234567890.cloudfront.net
```

If it doesn't resolve to your CloudFront domain:

```bash
# Create or update the CNAME record in Route 53
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "app.example.com",
                "Type": "A",
                "AliasTarget": {
                    "HostedZoneId": "Z2FDTNDATAQYW2",
                    "DNSName": "d1234567890.cloudfront.net",
                    "EvaluateTargetHealth": false
                }
            }
        }]
    }'
```

Note: `Z2FDTNDATAQYW2` is the hosted zone ID for all CloudFront distributions. It's a fixed value.

## Alternate Domain Names (CNAMEs) Not Configured

CloudFront won't serve traffic for a custom domain unless that domain is listed in the distribution's "Alternate Domain Names" (CNAMEs) setting:

```bash
# Check configured alternate domain names
aws cloudfront get-distribution-config --id E1234567890 \
    --query 'DistributionConfig.Aliases'
```

If your domain isn't listed, add it:

```bash
# Get current config, modify, and update
# (You need the full config and ETag for updates)
aws cloudfront get-distribution-config --id E1234567890 > dist-config.json
# Edit the Aliases section to add your domain
# Then update with the ETag
```

## SSL Certificate Issues

If you're using HTTPS with a custom domain, you need an ACM certificate that covers the domain. The certificate must be in the **us-east-1** region (that's a hard requirement for CloudFront).

```bash
# List certificates in us-east-1
aws acm list-certificates --region us-east-1 \
    --query 'CertificateSummaryList[].{Domain:DomainName,ARN:CertificateArn,Status:Status}'

# Check if a specific certificate covers your domain
aws acm describe-certificate \
    --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
    --region us-east-1 \
    --query 'Certificate.{Domain:DomainName,SANs:SubjectAlternativeNames,Status:Status}'
```

Common SSL issues:
- Certificate not in us-east-1
- Certificate doesn't cover the domain (check Subject Alternative Names)
- Certificate is in PENDING_VALIDATION status
- Certificate expired

## Origin Configuration Problems

CloudFront needs to be able to reach your origin. Common misconfigurations:

### S3 Origin

```bash
# Check origin configuration
aws cloudfront get-distribution-config --id E1234567890 \
    --query 'DistributionConfig.Origins.Items[].{Id:Id,DomainName:DomainName,S3Config:S3OriginConfig}'
```

For S3, use the regional endpoint, not the global one:

```
# Correct
my-bucket.s3.us-east-1.amazonaws.com

# Also works with newer OAC
my-bucket.s3.amazonaws.com

# Problematic (can cause redirect issues)
my-bucket.s3-website-us-east-1.amazonaws.com
```

If you're using the S3 website endpoint (for static website hosting), you need to configure the origin as a "Custom Origin" not an "S3 Origin."

### Custom Origin (ALB, API Gateway, etc.)

```bash
# Verify the origin is reachable
curl -I https://your-origin.example.com

# Check if security groups allow CloudFront's IP ranges
# CloudFront uses the ip-ranges.json for its IPs
curl -s https://ip-ranges.amazonaws.com/ip-ranges.json | \
    python3 -c "import sys,json; data=json.load(sys.stdin); [print(p['ip_prefix']) for p in data['prefixes'] if p['service']=='CLOUDFRONT']" | head -5
```

The origin's security group or firewall needs to allow traffic from CloudFront's IP ranges.

## Cache Behavior Mismatches

If requests hit the wrong cache behavior (or none at all), you might get unexpected results:

```bash
# Check cache behaviors
aws cloudfront get-distribution-config --id E1234567890 \
    --query 'DistributionConfig.{DefaultBehavior:DefaultCacheBehavior.TargetOriginId,Behaviors:CacheBehaviors.Items[].{Path:PathPattern,Origin:TargetOriginId}}'
```

Cache behaviors are matched in order by path pattern. The first match wins. The default behavior catches everything that doesn't match a specific pattern.

Common issues:
- API paths hitting the static content behavior (or vice versa)
- Path patterns not matching the expected URLs
- Wrong origin ID in a behavior

## Origin Protocol Policy

If your origin only supports HTTPS but CloudFront is trying HTTP (or vice versa), connections will fail:

```json
{
    "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only"
    }
}
```

Options are:
- `http-only` - CloudFront always uses HTTP to the origin
- `https-only` - CloudFront always uses HTTPS to the origin
- `match-viewer` - CloudFront uses whatever the viewer used

For ALB origins with HTTPS, make sure the ALB's certificate is valid. CloudFront validates origin SSL certificates by default.

## Geo Restriction

If users in certain countries can't access your distribution, check for geo restrictions:

```bash
aws cloudfront get-distribution-config --id E1234567890 \
    --query 'DistributionConfig.Restrictions.GeoRestriction'
```

## WAF Blocking Requests

If you have AWS WAF attached to the distribution, it might be blocking legitimate requests:

```bash
# Check if WAF is attached
aws cloudfront get-distribution-config --id E1234567890 \
    --query 'DistributionConfig.WebACLId'

# Check WAF logs for blocked requests
aws wafv2 get-web-acl --name my-web-acl --scope CLOUDFRONT --id <acl-id> --region us-east-1
```

## Testing and Debugging

Use CloudFront's request ID to trace issues:

```bash
# The x-amz-cf-id header in responses contains the request ID
curl -v https://app.example.com 2>&1 | grep -i 'x-amz-cf'

# Use this ID when contacting AWS Support
```

Enable CloudFront standard logging or real-time logging to see what's happening:

```bash
# Check if logging is enabled
aws cloudfront get-distribution-config --id E1234567890 \
    --query 'DistributionConfig.Logging'
```

For a comprehensive monitoring setup that covers CloudFront along with your other AWS infrastructure, have a look at [setting up CloudWatch alerting](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to catch distribution issues proactively.

## Summary

CloudFront troubleshooting involves checking multiple layers: DNS resolution, distribution configuration (alternate domains, SSL, enabled state), origin connectivity and protocol settings, and cache behavior matching. Start by confirming the distribution is deployed and enabled, verify DNS points to CloudFront, check the SSL certificate is in us-east-1 and valid, and test origin connectivity directly. Use CloudFront request IDs and access logs for deeper debugging.
