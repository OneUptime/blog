# How to Configure Fastly CDN for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fastly, IPv6, CDN, Edge Computing, VCL, Content Delivery

Description: A guide to configuring Fastly CDN for IPv6 delivery, including service configuration, origin IPv6 connectivity, and VCL for IPv6-aware caching and routing.

Fastly's edge network supports IPv6 natively, providing dual-stack delivery from its global POPs. IPv6 configuration involves enabling dualstack DNS for client connections, configuring origins to prefer IPv6 where appropriate, and using VCL (Varnish Configuration Language) for IPv6-aware logic.

## Fastly IPv6 Architecture

Fastly's POPs are dual-stack. When a client connects via IPv6:
- Fastly edge server accepts the IPv6 connection
- Fastly connects to your origin using IPv4 or IPv6 (based on origin config)
- Client IP information is available in VCL as `client.ip`, and `req.is_ipv6` indicates whether the request arrived over IPv6

## Enabling IPv6 via Fastly Dashboard

1. Log in to https://manage.fastly.com
2. Select your service and clone the active version for editing
3. If you use a Fastly-shared hostname, update your DNS CNAME target to the corresponding `dualstack.*.fastly.net` hostname
4. If you use a `map.fastly.net` hostname or Fastly Anycast IPv4 addresses for an apex domain, contact Fastly support to enable IPv6
5. Go to **Origins** and edit each host
6. In the IP version field, leave the checkbox selected to prefer IPv6 when your origin hostname has AAAA records
7. Activate the service version and test with `curl -6`

## Fastly API Configuration

```bash
# Add a backend that prefers IPv6 when resolving the origin hostname

FASTLY_API_KEY="your-api-key"
SERVICE_ID="your-service-id"
VERSION="1"

# Add backend with IPv6 preference for origin connections
curl -X POST \
  "https://api.fastly.com/service/${SERVICE_ID}/version/${VERSION}/backend" \
  -H "Fastly-Key: ${FASTLY_API_KEY}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=origin&address=origin.example.com&port=443&use_ssl=1&ssl_check_cert=1&prefer_ipv6=1"

# Client-side IPv6 is enabled separately by pointing DNS at a dualstack Fastly hostname
```

## Terraform: Fastly Service with IPv6

```hcl
terraform {
  required_providers {
    fastly = {
      source  = "fastly/fastly"
    }
  }
}

resource "fastly_service_vcl" "main" {
  name = "example-service"

  domain {
    name    = "cdn.example.com"
    comment = "CDN Domain"
  }

  backend {
    address     = "origin.example.com"
    name        = "main-origin"
    port        = 443
    use_ssl     = true
    prefer_ipv6 = true

    # Prefer IPv6 to the origin when the hostname has AAAA records
  }

  # main.vcl should be based on Fastly's boilerplate when used as the main custom VCL file
  vcl {
    name    = "main"
    content = file("${path.module}/main.vcl")
    main    = true
  }

  force_destroy = true
}
```

## VCL for IPv6-Aware Logic

Fastly's VCL provides `client.ip` and `req.is_ipv6` for IPv6-aware logic. If you use custom VCL as the main file, start from Fastly's boilerplate and add logic like the following:

```vcl
sub vcl_recv {
  if (fastly.ff.visits_this_service == 0 && req.restarts == 0) {
    set req.http.Fastly-Client-IP = client.ip;
  }

  # Check whether the request arrived over IPv6
  if (req.is_ipv6) {
    set req.http.X-Client-IP-Version = "IPv6";
    set req.http.X-Client-IPv6 = req.http.Fastly-Client-IP;
  } else {
    set req.http.X-Client-IP-Version = "IPv4";
  }

  # Pass to origin with client IP info
  set req.http.X-Forwarded-For = req.http.Fastly-Client-IP;
  set req.http.X-Real-IP = req.http.Fastly-Client-IP;
}

sub vcl_hash {
  # Optionally separate cache entries for IPv4 and IPv6 clients
  # hash_data(req.http.X-Client-IP-Version);
}

sub vcl_deliver {
  # Add diagnostic header showing IP version
  set resp.http.X-Client-Version = req.http.X-Client-IP-Version;
}
```

## Testing Fastly IPv6 Delivery

```bash
# Verify Fastly service has AAAA records
dig AAAA cdn.example.com
# Should return Fastly-managed IPv6 addresses for the hostname

# Test IPv6 client connection
curl -6 -v https://cdn.example.com/

# Check Fastly response headers
curl -6 -D - https://cdn.example.com/ -o /dev/null | \
  grep -E "X-Served-By|X-Cache|X-Client-Version"

# Verify cache hit vs miss for IPv6 (for cacheable content)
curl -6 -I https://cdn.example.com/
# First request typically: X-Cache: MISS
curl -6 -I https://cdn.example.com/
# Second request often: X-Cache: HIT
```

## IPv6 Rate Limiting in VCL

If Edge Rate Limiting is enabled on your account, you can group IPv6 clients by /64 prefix:

```vcl
ratecounter ipv6_clients {}
penaltybox ipv6_blocked {}

sub vcl_recv {
  declare local var.client_ip IP;
  declare local var.ipv6_prefix STRING;

  if (fastly.ff.visits_this_service == 0 && req.restarts == 0) {
    set req.http.Fastly-Client-IP = client.ip;
  }

  set var.client_ip = std.str2ip(req.http.Fastly-Client-IP, "::");

  # Rate limit based on /64 prefix for IPv6 (groups addresses by subnet)
  if (req.is_ipv6) {
    # Build a stable key from the first 64 bits of the IPv6 address
    set var.ipv6_prefix = std.itoa(addr.extract_bits(var.client_ip, 0, 32), 16) + ":" +
      std.itoa(addr.extract_bits(var.client_ip, 32, 32), 16);

    if (ratelimit.check_rate(var.ipv6_prefix, ipv6_clients, 1, 10, 100, ipv6_blocked, 2m)) {
      error 429 "Too Many Requests";
    }
  }
}
```

Fastly's IPv6 support means most of the work is enabling dualstack DNS for client traffic, configuring origins to prefer IPv6 where needed, and using `req.is_ipv6`, `client.ip`, and `Fastly-Client-IP` appropriately in VCL.
