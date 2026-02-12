# How to Create Route 53 Private Hosted Zones

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, VPC, Networking

Description: Learn how to create and manage Route 53 private hosted zones for internal DNS resolution within your VPCs, including multi-VPC association, split-horizon DNS, and cross-account sharing.

---

Private hosted zones in Route 53 let you create DNS records that are only resolvable from within your VPCs. They're perfect for internal service names, database endpoints, and any situation where you want DNS names for resources that shouldn't be reachable from the public internet.

Instead of your developers memorizing IP addresses or maintaining hosts files, you give resources human-readable names like `db-primary.internal.mycompany.com` that only work inside your VPC.

## Creating a Private Hosted Zone

The key difference from a public hosted zone is that you must associate it with at least one VPC.

```bash
# Create a private hosted zone associated with a VPC
aws route53 create-hosted-zone \
  --name internal.mycompany.com \
  --caller-reference "internal-$(date +%s)" \
  --vpc VPCRegion=us-east-1,VPCId=vpc-0abc123def456789 \
  --hosted-zone-config Comment="Internal DNS for production",PrivateZone=true
```

That's it. The zone is now active and your instances in `vpc-0abc123def456789` can resolve records in `internal.mycompany.com`.

Two VPC attributes must be enabled for private hosted zones to work:
- `enableDnsSupport` must be `true`
- `enableDnsHostnames` must be `true`

```bash
# Verify VPC DNS settings
aws ec2 describe-vpc-attribute --vpc-id vpc-0abc123def456789 --attribute enableDnsSupport
aws ec2 describe-vpc-attribute --vpc-id vpc-0abc123def456789 --attribute enableDnsHostnames
```

For more on VPC DNS configuration, see https://oneuptime.com/blog/post/configure-dns-resolution-in-vpc/view.

## Adding Records

Adding records works the same as public hosted zones.

```bash
# Add A records for internal services
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0PRIVATE123456 \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "db-primary.internal.mycompany.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [{"Value": "10.0.2.50"}]
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "cache.internal.mycompany.com",
          "Type": "CNAME",
          "TTL": 60,
          "ResourceRecords": [{"Value": "my-redis.abc123.ng.0001.use1.cache.amazonaws.com"}]
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.internal.mycompany.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z26RNL4JYFTOTI",
            "DNSName": "internal-api-nlb-123.us-east-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'
```

I recommend keeping TTLs low (60 seconds) for private zone records since these are internal and the cost of extra DNS queries is negligible. Low TTLs give you faster failover when you need to update records during an incident.

## Associating Multiple VPCs

A single private hosted zone can be associated with multiple VPCs. This is how you make internal DNS names available across your VPC infrastructure.

```bash
# Associate another VPC with the private hosted zone
aws route53 associate-vpc-with-hosted-zone \
  --hosted-zone-id Z0PRIVATE123456 \
  --vpc VPCRegion=us-east-1,VPCId=vpc-staging-123 \
  --comment "Adding staging VPC"

# Associate a VPC in a different region
aws route53 associate-vpc-with-hosted-zone \
  --hosted-zone-id Z0PRIVATE123456 \
  --vpc VPCRegion=eu-west-1,VPCId=vpc-europe-456 \
  --comment "Adding European VPC"
```

This works across regions, which is really useful. A private hosted zone in us-east-1 can be associated with VPCs in any region. All associated VPCs can resolve the same records.

To list current VPC associations:

```bash
# List VPCs associated with a private hosted zone
aws route53 list-hosted-zone-vpcs \
  --hosted-zone-id Z0PRIVATE123456
```

## Cross-Account VPC Association

When you need to share a private hosted zone with a VPC in another AWS account, you use an authorization and association workflow.

```bash
# In the hosted zone owner's account: create an authorization
aws route53 create-vpc-association-authorization \
  --hosted-zone-id Z0PRIVATE123456 \
  --vpc VPCRegion=us-east-1,VPCId=vpc-other-account-789

# In the other account: associate the VPC with the authorized zone
aws route53 associate-vpc-with-hosted-zone \
  --hosted-zone-id Z0PRIVATE123456 \
  --vpc VPCRegion=us-east-1,VPCId=vpc-other-account-789

# Back in the owner's account: clean up the authorization (optional)
aws route53 delete-vpc-association-authorization \
  --hosted-zone-id Z0PRIVATE123456 \
  --vpc VPCRegion=us-east-1,VPCId=vpc-other-account-789
```

This is a common pattern in multi-account AWS organizations where a shared services account hosts the private zone and other accounts' VPCs consume it.

## Split-Horizon DNS

Split-horizon DNS means the same domain name resolves to different addresses depending on where the query comes from. Route 53 supports this by letting you have a public and private hosted zone for the same domain name.

```bash
# You already have a public hosted zone for example.com
# Create a private hosted zone for the same domain
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "example-private-$(date +%s)" \
  --vpc VPCRegion=us-east-1,VPCId=vpc-0abc123def456789 \
  --hosted-zone-config Comment="Internal override zone",PrivateZone=true
```

Now when an instance in your VPC queries `api.example.com`, it gets the private hosted zone's record (maybe an internal IP). When someone on the internet queries the same name, they get the public hosted zone's record (the public-facing ALB).

This is great for reducing latency on internal traffic. Instead of your instances hitting the public ALB and hairpinning back through the internet gateway, they go directly to the internal endpoint.

```bash
# In the private zone: point to the internal load balancer
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0PRIVATE123456 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z26RNL4JYFTOTI",
          "DNSName": "internal-api-nlb.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

## Terraform Configuration

```hcl
resource "aws_route53_zone" "internal" {
  name    = "internal.mycompany.com"
  comment = "Internal DNS"

  vpc {
    vpc_id = aws_vpc.production.id
  }

  vpc {
    vpc_id = aws_vpc.staging.id
  }
}

resource "aws_route53_record" "db_primary" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "db-primary.internal.mycompany.com"
  type    = "A"
  ttl     = 60
  records = [aws_db_instance.primary.address]
}

resource "aws_route53_record" "api_internal" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "api.internal.mycompany.com"
  type    = "A"

  alias {
    name                   = aws_lb.internal_api.dns_name
    zone_id                = aws_lb.internal_api.zone_id
    evaluate_target_health = true
  }
}
```

## Wildcard Records

Wildcard records are useful in private zones for catch-all patterns.

```bash
# Create a wildcard record for all subdomains
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0PRIVATE123456 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "*.dev.internal.mycompany.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "dev-ingress.internal.mycompany.com"}]
        }
    }]
  }'
```

This routes all `*.dev.internal.mycompany.com` queries to a single ingress point, where the application can route based on the hostname. It's a common pattern for development environments.

## Monitoring and Troubleshooting

Route 53 Resolver query logging lets you see every DNS query made within your VPCs. This is invaluable for debugging private hosted zone issues.

```bash
# Create a query log configuration
aws route53resolver create-resolver-query-log-config \
  --name "vpc-dns-logs" \
  --destination-arn "arn:aws:s3:::my-dns-logs-bucket"

# Associate it with your VPC
aws route53resolver associate-resolver-query-log-config \
  --resolver-query-log-config-id rqlc-0123456789abcdef0 \
  --resource-id vpc-0abc123def456789
```

If records aren't resolving, check these common issues: VPC DNS attributes disabled, wrong VPC association, overlapping records in multiple private zones, and security groups blocking DNS port 53.

Private hosted zones are one of the cleaner ways to manage internal DNS in AWS. They integrate naturally with your VPCs, support multi-account architectures, and provide split-horizon DNS without any hacks. Use them freely for making your infrastructure more navigable.
