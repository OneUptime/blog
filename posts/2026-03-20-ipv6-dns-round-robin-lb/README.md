# How to Configure IPv6 Load Balancing with DNS Round-Robin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Round-Robin, Load Balancing, AAAA, High Availability

Description: A guide to implementing IPv6 load balancing using DNS round-robin with AAAA records, including TTL tuning, health checking, and limitations.

DNS round-robin load balancing distributes traffic across multiple IPv6 servers by publishing multiple AAAA records for the same hostname and varying their order in DNS responses. It's the simplest form of load balancing, requiring no dedicated load balancer hardware or software - just DNS configuration.

## Basic DNS Round-Robin for IPv6

Configure multiple AAAA records for the same hostname:

```text
; BIND zone file configuration

$TTL 60    ; Short TTL for fast failover (60 seconds)

api.example.com.    IN    AAAA    2001:db8::101
api.example.com.    IN    AAAA    2001:db8::102
api.example.com.    IN    AAAA    2001:db8::103
```

Authoritative DNS servers return the full AAAA RRset, and many implementations vary the order between responses.

## Configuration in Different DNS Systems

### BIND (named.conf + zone file)

```text
; zone/example.com
$TTL 60

@    IN    SOA    ns1.example.com. admin.example.com. (
                  2026031901 ; serial
                  3600 ; refresh
                  1800 ; retry
                  604800 ; expire
                  300 ) ; negative cache TTL

; IPv6 round-robin
api    60    IN    AAAA    2001:db8::101
api    60    IN    AAAA    2001:db8::102
api    60    IN    AAAA    2001:db8::103
```

### Cloudflare DNS (Terraform)

```hcl
# Multiple DNS-only AAAA records for round-robin
resource "cloudflare_dns_record" "api_v6_1" {
  zone_id = var.zone_id
  name    = "api"
  type    = "AAAA"
  content = "2001:db8::101"
  ttl     = 60
  proxied = false
}

resource "cloudflare_dns_record" "api_v6_2" {
  zone_id = var.zone_id
  name    = "api"
  type    = "AAAA"
  content = "2001:db8::102"
  ttl     = 60
  proxied = false
}

resource "cloudflare_dns_record" "api_v6_3" {
  zone_id = var.zone_id
  name    = "api"
  type    = "AAAA"
  content = "2001:db8::103"
  ttl     = 60
  proxied = false
}
```

### AWS Route 53 (Multivalue Answer Routing)

```hcl
resource "aws_route53_record" "api_v6_1" {
  zone_id = aws_route53_zone.main.id
  name    = "api.example.com"
  type    = "AAAA"
  ttl     = 60
  records = ["2001:db8::101"]

  set_identifier                   = "server1"
  multivalue_answer_routing_policy = true
}

resource "aws_route53_record" "api_v6_2" {
  zone_id = aws_route53_zone.main.id
  name    = "api.example.com"
  type    = "AAAA"
  ttl     = 60
  records = ["2001:db8::102"]

  set_identifier                   = "server2"
  multivalue_answer_routing_policy = true
}

resource "aws_route53_record" "api_v6_3" {
  zone_id = aws_route53_zone.main.id
  name    = "api.example.com"
  type    = "AAAA"
  ttl     = 60
  records = ["2001:db8::103"]

  set_identifier                   = "server3"
  multivalue_answer_routing_policy = true
}

# Or use Route 53 Weighted Routing for controlled distribution
resource "aws_route53_record" "api_v6_1" {
  zone_id = aws_route53_zone.main.id
  name    = "api.example.com"
  type    = "AAAA"
  ttl     = 60
  records = ["2001:db8::101"]

  weighted_routing_policy {
    weight = 50    # Relative weight compared with sibling records
  }

  set_identifier = "server1"
}
```

## Health Checking with DNS Round-Robin

Pure DNS round-robin doesn't remove failed servers. Use DNS health checking:

```hcl
# Using Route 53 health checks
resource "aws_route53_health_check" "server1" {
  fqdn              = "api.example.com"
  ip_address        = "2001:db8::101"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}

resource "aws_route53_record" "api_v6_1" {
  zone_id = aws_route53_zone.main.id
  name    = "api.example.com"
  type    = "AAAA"
  ttl     = 60
  records = ["2001:db8::101"]

  set_identifier                   = "server1"
  multivalue_answer_routing_policy = true
  health_check_id                  = aws_route53_health_check.server1.id
}
```

## TTL Strategy

```text
Short TTL (30-60s):
  Pros: Fast failover if a server goes down
  Cons: Higher DNS query load, more cache misses

Long TTL (300-3600s):
  Pros: Fewer DNS queries, more efficient
  Cons: Slow failover, clients cache old addresses

Recommended:
  Normal: 60 seconds (balance of speed and efficiency)
  Emergency/active incident: 30 seconds
```

## Testing DNS Round-Robin

```bash
# Query the authoritative server directly to see response order changes
for i in {1..5}; do
  dig @ns1.example.com api.example.com AAAA +norecurse +short
  echo "---"
done

# Verify all addresses are returned
dig @ns1.example.com api.example.com AAAA +norecurse

# Test each address directly
for addr in 2001:db8::101 2001:db8::102 2001:db8::103; do
  echo -n "Testing $addr: "
  curl -6 --resolve "api.example.com:443:[$addr]" -fsS https://api.example.com/health >/dev/null && echo "OK" || echo "FAILED"
done
```

## Limitations of DNS Round-Robin

| Limitation | Impact |
|---|---|
| No built-in health checking | Failed servers stay in rotation unless you add external health checks |
| Client-side caching | TTL may not be respected, distribution uneven |
| No session persistence | Same client may go to different server each request |
| Uneven distribution | Some resolvers don't rotate properly |

For production use, DNS round-robin works best as a secondary distribution mechanism combined with a proper load balancer for health checking and session management.
