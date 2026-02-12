# How to Create Route 53 Public Hosted Zones

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Networking

Description: Step-by-step guide to creating and managing Route 53 public hosted zones, including domain delegation, record management, zone migration, and best practices for production DNS.

---

A public hosted zone in Route 53 is a container for DNS records that tell the internet how to route traffic to your domain. When someone types your domain name in a browser, the DNS records in your hosted zone determine where that request goes. It's the foundation of your public-facing DNS infrastructure on AWS.

Creating a hosted zone is simple. Getting it right for production takes a bit more thought. Let's cover both.

## Creating a Public Hosted Zone

```bash
# Create a public hosted zone for your domain
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-com-$(date +%s)" \
  --hosted-zone-config Comment="Production hosted zone for example.com"
```

The `caller-reference` must be unique for each create request. Using a timestamp ensures uniqueness. If you accidentally run the command twice with the same caller reference, Route 53 returns the existing zone rather than creating a duplicate.

The output gives you the hosted zone ID and four name server records. These are crucial - you'll need them to delegate the domain to Route 53.

```bash
# Get the name servers for your hosted zone
aws route53 get-hosted-zone \
  --id Z0123456789ABCDEFGHIJ \
  --query 'DelegationSet.NameServers'

# Example output:
# [
#   "ns-1234.awsdns-56.org",
#   "ns-789.awsdns-01.co.uk",
#   "ns-456.awsdns-23.com",
#   "ns-1.awsdns-45.net"
# ]
```

## Delegating Your Domain

After creating the hosted zone, you need to update your domain registrar to use Route 53's name servers. If your domain is registered with Route 53 (see https://oneuptime.com/blog/post/register-domain-with-route-53/view), this happens automatically. Otherwise, log into your registrar and replace the existing name servers with the four Route 53 name servers.

This delegation change can take up to 48 hours to propagate, though it usually happens within a few hours. During the transition period, some DNS resolvers will use the old name servers and some will use the new ones.

You can verify delegation is working.

```bash
# Check which name servers are authoritative for your domain
dig NS example.com +short

# Should return the four Route 53 name servers
```

## Adding DNS Records

Once the hosted zone is active and delegated, start adding records.

```bash
# Add an A record pointing to an IP address
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "52.1.2.3"}
          ]
        }
      }
    ]
  }'

# Add a CNAME record for www
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "www.example.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "example.com"}
          ]
        }
      }
    ]
  }'

# Add an MX record for email
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "MX",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "10 mail1.example.com"},
            {"Value": "20 mail2.example.com"}
          ]
        }
      }
    ]
  }'
```

For AWS resources like ALBs, CloudFront distributions, and S3 buckets, use Alias records instead of CNAMEs. Alias records are free (no per-query charges), work at the zone apex (example.com without www), and respond with the target's actual IP. For a comparison, see https://oneuptime.com/blog/post/route-53-alias-records-vs-cname/view.

```bash
# Add an Alias record pointing to an ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "my-alb-123456.us-east-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'
```

## Batch Record Changes

When you need to create multiple records at once, batch them into a single change batch. This is faster and atomic - either all changes apply or none do.

```bash
# Create a JSON file with multiple record changes
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Comment": "Initial DNS setup",
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "api-alb-123.us-east-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "staging.example.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "staging-alb-456.us-east-1.elb.amazonaws.com"}]
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "TXT",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "\"v=spf1 include:_spf.google.com ~all\""}
          ]
        }
      }
    ]
  }'
```

## Listing Records

```bash
# List all records in a hosted zone
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --output table

# List records starting from a specific name (for pagination)
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --start-record-name api.example.com \
  --start-record-type A
```

## Terraform Configuration

```hcl
resource "aws_route53_zone" "main" {
  name    = "example.com"
  comment = "Production hosted zone"
}

resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 300
  records = [
    "10 mail1.example.com",
    "20 mail2.example.com",
  ]
}
```

## Migration from Another DNS Provider

If you're migrating from another DNS provider, export your records, create the hosted zone, import the records, and then change the name servers at your registrar.

```bash
# Export records from the old provider (format varies by provider)
# Then import them into Route 53 using change batches

# Verify all records are correct before switching name servers
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --query 'ResourceRecordSets[*].{Name:Name,Type:Type,TTL:TTL}' \
  --output table
```

Lower TTLs on your records before the migration (set them to 60-300 seconds). This ensures that after you switch name servers, clients pick up the new records quickly. After migration is confirmed, you can raise TTLs back to normal values.

## Costs

Route 53 public hosted zones cost $0.50 per month per zone. DNS queries are billed at $0.40 per million for the first billion queries, then cheaper after that. Alias queries to AWS resources (ALBs, CloudFront, S3) are free.

For most applications, Route 53 costs are negligible. But if you have thousands of hosted zones (maybe you're a SaaS provider with custom domains for each customer), those $0.50/month charges add up.

## Best Practices

- Always use Alias records for AWS resources instead of CNAMEs
- Set reasonable TTLs - 300 seconds is a good default, lower for records that change frequently
- Use Route 53 health checks with failover routing for high availability
- Keep your zone clean - delete records for decommissioned resources
- Monitor query volumes through CloudWatch to detect unusual patterns

Your public hosted zone is the front door to your infrastructure. Treat its configuration with the same care you'd give to any other production system.
