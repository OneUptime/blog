# How to Set Up Dual-Stack CloudFront Distributions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, IPv6, CDN, Networking

Description: Learn how to configure CloudFront distributions with dual-stack (IPv4 and IPv6) support to serve content to users on both IPv4 and IPv6 networks.

---

More ISPs are rolling out IPv6 to their customers every year. If your CloudFront distribution only serves over IPv4, you're forcing IPv6-native users through translation layers that add latency. Dual-stack distributions serve content over both IPv4 and IPv6, letting each user connect using whichever protocol is native to their network.

The good news is that CloudFront supports dual-stack out of the box - you just need to enable it and make sure your DNS is set up correctly. Let's walk through the full configuration.

## Enabling IPv6 on CloudFront

CloudFront distributions support IPv6 through a single configuration flag. When enabled, CloudFront responds to both A (IPv4) and AAAA (IPv6) DNS queries.

Enable IPv6 on a new distribution:

```bash
# Create a distribution with IPv6 enabled
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "dual-stack-dist-001",
    "Comment": "Dual-stack distribution",
    "Enabled": true,
    "IsIPV6Enabled": true,
    "DefaultCacheBehavior": {
      "TargetOriginId": "s3-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true,
      "AllowedMethods": ["GET", "HEAD"],
      "CachedMethods": ["GET", "HEAD"]
    },
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "s3-origin",
          "DomainName": "my-bucket.s3.us-east-1.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": "origin-access-identity/cloudfront/E1234567890"
          }
        }
      ]
    },
    "PriceClass": "PriceClass_All"
  }'
```

Enable IPv6 on an existing distribution:

```bash
# Get the current config
aws cloudfront get-distribution-config --id E1234567890ABC > config.json

# Update IsIPV6Enabled to true in the config
# Then apply the update
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --if-match CURRENT_ETAG \
  --distribution-config file://updated-config.json
```

## DNS Configuration for Dual-Stack

When using a custom domain with your CloudFront distribution, you need both A and AAAA alias records in Route 53.

Create dual-stack DNS records in Route 53:

```bash
# Create both A and AAAA alias records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "cdn.example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d1234567abcdef.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "cdn.example.com",
          "Type": "AAAA",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d1234567abcdef.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }'
```

The hosted zone ID `Z2FDTNDATAQYW2` is the fixed CloudFront hosted zone ID. It's the same for all CloudFront distributions.

If you only create an A record without an AAAA record, IPv6-native users won't be able to resolve your domain. Make sure you always create both.

## CloudFormation Template

Here's a complete dual-stack CloudFormation setup:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Dual-Stack CloudFront Distribution

Parameters:
  DomainName:
    Type: String
  CertificateArn:
    Type: String
  OriginBucket:
    Type: String
  HostedZoneId:
    Type: String

Resources:
  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        IPV6Enabled: true
        Comment: Dual-stack CDN distribution
        Aliases:
          - !Ref DomainName
        ViewerCertificate:
          AcmCertificateArn: !Ref CertificateArn
          SslSupportMethod: sni-only
          MinimumProtocolVersion: TLSv1.2_2021
        DefaultCacheBehavior:
          TargetOriginId: s3-origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          Compress: true
        Origins:
          - Id: s3-origin
            DomainName: !Sub "${OriginBucket}.s3.${AWS::Region}.amazonaws.com"
            S3OriginConfig:
              OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${OAI}"
        PriceClass: PriceClass_All

  OAI:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: OAI for dual-stack distribution

  # IPv4 alias record
  IPv4Record:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZoneId
      Name: !Ref DomainName
      Type: A
      AliasTarget:
        HostedZoneId: Z2FDTNDATAQYW2
        DNSName: !GetAtt Distribution.DomainName
        EvaluateTargetHealth: false

  # IPv6 alias record
  IPv6Record:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZoneId
      Name: !Ref DomainName
      Type: AAAA
      AliasTarget:
        HostedZoneId: Z2FDTNDATAQYW2
        DNSName: !GetAtt Distribution.DomainName
        EvaluateTargetHealth: false

Outputs:
  DistributionDomain:
    Value: !GetAtt Distribution.DomainName
  DistributionId:
    Value: !Ref Distribution
```

## Verifying Dual-Stack Setup

After configuration, verify that both IPv4 and IPv6 records resolve correctly.

Test DNS resolution:

```bash
# Check IPv4 resolution
dig cdn.example.com A +short
# Should return an IPv4 address like 13.224.x.x

# Check IPv6 resolution
dig cdn.example.com AAAA +short
# Should return an IPv6 address like 2600:9000:xxxx::xxxx

# Test actual connectivity over IPv6
curl -6 https://cdn.example.com/test-page -I

# Test over IPv4
curl -4 https://cdn.example.com/test-page -I
```

## Handling IPv6 in CloudFront Functions

If your CloudFront Functions process client IPs (for geolocation, rate limiting, or logging), make sure they handle both IPv4 and IPv6 addresses.

CloudFront Function handling both IP versions:

```javascript
function handler(event) {
  const request = event.request;
  const clientIP = event.viewer.ip;

  // Detect IP version
  const isIPv6 = clientIP.includes(':');

  // Add header indicating IP version (for backend processing)
  request.headers['x-client-ip-version'] = {
    value: isIPv6 ? 'IPv6' : 'IPv4'
  };
  request.headers['x-client-ip'] = {
    value: clientIP
  };

  // If using IP-based allowlists, handle both formats
  const allowedIPv4 = ['203.0.113.0/24'];
  const allowedIPv6 = ['2001:db8::/32'];

  // Your allowlist logic here
  // Note: CloudFront Functions don't support CIDR matching natively
  // Use exact matches or prefix checks

  return request;
}
```

## Security Group Considerations for Origins

If your origin is behind a security group (EC2, ALB, etc.), make sure the security group allows traffic from CloudFront's IPv6 ranges.

CloudFront uses a published list of IP ranges. You can fetch them and update security groups:

```bash
# Fetch CloudFront IP ranges
curl -s https://ip-ranges.amazonaws.com/ip-ranges.json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
# IPv4 ranges
for prefix in data['prefixes']:
    if prefix['service'] == 'CLOUDFRONT':
        print(f\"IPv4: {prefix['ip_prefix']}\")
# IPv6 ranges
for prefix in data['ipv6_prefixes']:
    if prefix['service'] == 'CLOUDFRONT':
        print(f\"IPv6: {prefix['ipv6_prefix']}\")
"
```

For origins that CloudFront connects to, note that CloudFront-to-origin connections use IPv4 by default. Even when users connect to CloudFront over IPv6, CloudFront typically connects to your origin over IPv4. If your origin only has IPv6, make sure to configure it appropriately.

## Monitoring IPv6 Traffic

Track the ratio of IPv4 vs IPv6 traffic to understand your user base:

```bash
# Enable CloudFront access logging
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --if-match ETAG \
  --distribution-config file://config-with-logging.json
```

The access logs include the client IP address. You can analyze logs to determine what percentage of your traffic is IPv6:

```python
import gzip
import ipaddress

ipv4_count = 0
ipv6_count = 0

with gzip.open('cloudfront-log.gz', 'rt') as f:
    for line in f:
        if line.startswith('#'):
            continue
        fields = line.split('\t')
        client_ip = fields[4]  # c-ip field
        try:
            addr = ipaddress.ip_address(client_ip)
            if isinstance(addr, ipaddress.IPv6Address):
                ipv6_count += 1
            else:
                ipv4_count += 1
        except ValueError:
            pass

total = ipv4_count + ipv6_count
print(f"IPv4: {ipv4_count} ({ipv4_count/total*100:.1f}%)")
print(f"IPv6: {ipv6_count} ({ipv6_count/total*100:.1f}%)")
```

## Common Issues

**DNS not returning AAAA records**: Make sure you created the AAAA alias record in Route 53 and that IPv6 is enabled on the distribution.

**IPv6 clients can't connect**: Verify your ACM certificate is valid and your origin allows traffic from CloudFront IP ranges.

**CloudFront Functions breaking on IPv6**: Test your functions with both IPv4 and IPv6 addresses in the viewer IP field.

**WAF rules not matching IPv6**: If you use AWS WAF with your distribution, make sure your IP set rules include IPv6 CIDRs where appropriate.

Dual-stack is a straightforward configuration that's worth enabling on every CloudFront distribution. There's no downside - IPv4 users are unaffected, and IPv6 users get a better experience. For more CloudFront optimization, see our guide on [Origin Shield](https://oneuptime.com/blog/post/2026-02-12-cloudfront-origin-shield-cache-optimization/view).
