# How to Configure Route 53 Multivalue Answer Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, High Availability

Description: Learn how to configure Route 53 multivalue answer routing to return multiple healthy IP addresses in DNS responses, providing basic load balancing and improved availability without a load balancer.

---

Multivalue answer routing in Route 53 is like simple routing with health checks bolted on. When a client queries a record with multiple values, Route 53 returns up to eight healthy IP addresses. The client picks one (usually at random), and since Route 53 only returns healthy endpoints, the client is much less likely to hit a dead server.

It's not a replacement for a real load balancer - there's no session affinity, no connection draining, and no intelligent distribution. But it's a solid improvement over simple DNS round-robin when you need basic availability across multiple endpoints without the cost and complexity of an ALB or NLB.

## How Multivalue Answer Routing Works

You create multiple records with the same name, each with a unique set identifier, and each associated with a health check. Route 53 returns all healthy records in the response (up to 8 out of any number you configure). If a health check fails, that record is removed from responses.

The difference from simple routing with multiple values: with simple routing, Route 53 returns all values regardless of health. With multivalue answer routing, unhealthy values are excluded.

The difference from failover routing: failover gives you one primary and one secondary. Multivalue answer gives you many values with individual health checks, all active simultaneously.

## Setting Up Multivalue Answer Records

Let's set up multivalue answer routing across four servers.

```bash
# Server 1
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "server-1",
        "MultiValueAnswer": true,
        "TTL": 60,
        "HealthCheckId": "health-check-server-1",
        "ResourceRecords": [{"Value": "52.1.2.3"}]
      }
    }]
  }'

# Server 2
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "server-2",
        "MultiValueAnswer": true,
        "TTL": 60,
        "HealthCheckId": "health-check-server-2",
        "ResourceRecords": [{"Value": "52.4.5.6"}]
      }
    }]
  }'

# Server 3
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "server-3",
        "MultiValueAnswer": true,
        "TTL": 60,
        "HealthCheckId": "health-check-server-3",
        "ResourceRecords": [{"Value": "52.7.8.9"}]
      }
    }]
  }'

# Server 4
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "server-4",
        "MultiValueAnswer": true,
        "TTL": 60,
        "HealthCheckId": "health-check-server-4",
        "ResourceRecords": [{"Value": "52.10.11.12"}]
      }
    }]
  }'
```

Each record has exactly one IP address and its own health check. When server-2's health check fails, Route 53 stops including 52.4.5.6 in responses. The remaining three servers continue receiving traffic.

## Creating the Health Checks

Each multivalue answer record needs its own health check.

```bash
# Create health checks for each server
for i in 1 2 3 4; do
  aws route53 create-health-check \
    --caller-reference "server-$i-health-$(date +%s)" \
    --health-check-config "{
      \"IPAddress\": \"52.$((i*3-2)).$((i*3-1)).$((i*3))\",
      \"Port\": 443,
      \"Type\": \"HTTPS\",
      \"ResourcePath\": \"/health\",
      \"RequestInterval\": 10,
      \"FailureThreshold\": 2
    }"
done
```

I recommend a short `RequestInterval` (10 seconds) and a low `FailureThreshold` (2) for multivalue answer records. Since the whole point is fast removal of unhealthy endpoints, you want Route 53 to detect failures quickly.

For more on health check configuration, see https://oneuptime.com/blog/post/route-53-health-checks/view.

## Terraform Configuration

```hcl
locals {
  servers = {
    "server-1" = "52.1.2.3"
    "server-2" = "52.4.5.6"
    "server-3" = "52.7.8.9"
    "server-4" = "52.10.11.12"
  }
}

# Create health checks for each server
resource "aws_route53_health_check" "servers" {
  for_each = local.servers

  ip_address        = each.value
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  request_interval  = 10
  failure_threshold = 2

  tags = {
    Name = "${each.key}-health"
  }
}

# Create multivalue answer records
resource "aws_route53_record" "app" {
  for_each = local.servers

  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  set_identifier = each.key

  multivalue_answer_routing_policy = true

  records         = [each.value]
  health_check_id = aws_route53_health_check.servers[each.key].id
}
```

Using `for_each` makes it easy to add or remove servers - just update the `servers` map and Terraform handles the rest.

## When to Use Multivalue Answer vs Other Options

Here's how multivalue answer routing compares to alternatives:

**Multivalue Answer vs Simple Routing:**
Simple routing returns all values regardless of health. Multivalue answer removes unhealthy values. Use multivalue answer when you want DNS-level health checking without the complexity of other routing policies.

**Multivalue Answer vs Weighted Routing:**
Weighted routing returns a single value per query based on weights. Multivalue answer returns up to 8 values per query. Use weighted when you need precise traffic distribution percentages. Use multivalue answer when you want all healthy endpoints returned.

**Multivalue Answer vs ALB/NLB:**
Load balancers do real-time health checking, connection draining, sticky sessions, and intelligent distribution. Multivalue answer is just DNS. Use a load balancer for anything production-critical. Use multivalue answer for simpler services where you don't want the cost and complexity of a load balancer.

## Response Behavior

When a DNS client queries a multivalue answer record, Route 53 returns up to 8 records. If you have more than 8 healthy records, Route 53 selects 8 at random. DNS clients typically use the first IP in the response, though some shuffle the list.

```bash
# Query to see what Route 53 returns
dig app.example.com +short

# Example output (all healthy servers):
# 52.1.2.3
# 52.4.5.6
# 52.7.8.9
# 52.10.11.12

# After server-2 fails its health check:
# 52.1.2.3
# 52.7.8.9
# 52.10.11.12
```

## Practical Use Cases

**Static website origins.** If you're running identical web servers without a load balancer, multivalue answer routing gives you basic high availability.

**API endpoints across multiple instances.** For stateless APIs where any instance can handle any request, multivalue answer routing distributes traffic and removes failed instances automatically.

**Edge locations.** If you have servers in multiple locations and want clients to get a random selection of healthy ones, multivalue answer works well.

**Supplementing monitoring.** While Route 53 health checks detect failures, you should also monitor your endpoints with a dedicated tool like OneUptime for deeper visibility into performance degradation that might not trigger a binary health check failure.

## Limitations

- Each record can only contain one IP address (unlike simple routing where one record can have multiple IPs)
- Returns up to 8 healthy values per query
- No support for Alias records - you must use IP addresses
- The traffic distribution is random, not weighted or latency-based
- DNS caching means it takes time for clients to stop hitting a newly-unhealthy server

Multivalue answer routing fills a specific niche: health-checked DNS round-robin without the overhead of a load balancer. It's not the right choice for every workload, but for stateless services where simplicity matters, it gets the job done with minimal configuration.
