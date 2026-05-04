# How to Configure Nginx Rate Limiting for IPv6 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, Rate Limiting, Security, Limit_req

Description: Learn how to configure Nginx rate limiting for IPv6 clients, including per-address and per-subnet rate limits to protect against abuse while accommodating IPv6 address rotation.

## Basic Rate Limiting for IPv6

```nginx
http {
    # Rate limit zone based on client IP (works for IPv4 and IPv6)
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    server {
        listen [::]:80 ipv6only=on;
        listen 80;

        server_name example.com;

        location /api/ {
            # Apply rate limit: 10 requests/sec, burst of 20
            limit_req zone=general burst=20 nodelay;
            limit_req_status 429;

            proxy_pass http://[2001:db8::1]:3000;
        }
    }
}
```

## IPv6-Specific Rate Limiting Consideration

IPv6 clients may use many different addresses (privacy extensions rotate addresses). Rate limiting by `/128` may not be effective - consider limiting by `/64` subnet:

```nginx
http {
    # Map client IPv6 to /64 prefix for subnet-based limiting
    map $remote_addr $ipv6_subnet {
        default                $remote_addr;

        # For IPv6 addresses, extract the /64 prefix
        # Note: Nginx doesn't have built-in IPv6 prefix extraction
        # Use a GeoIP2 module or limit by /128 (per-address)
        ~^([0-9a-f:]{1,39})    $1;
    }

    # Rate limit by individual IPv6 address (128-bit)
    limit_req_zone $binary_remote_addr zone=ipv6_addr:10m rate=30r/m;

    # Rate limit by connection count
    limit_conn_zone $binary_remote_addr zone=addr_conn:10m;

    server {
        location /login {
            # Strict login rate limiting
            limit_req zone=ipv6_addr burst=5 nodelay;
            limit_conn addr_conn 10;
            limit_req_status 429;
            limit_conn_status 429;
        }
    }
}
```

## Different Rates for IPv4 and IPv6

```nginx
http {
    # Separate zones for IPv4 and IPv6
    geo $limit_key {
        default                     $binary_remote_addr;
        # Could map IPv6 ranges to a zone identifier
    }

    # Zone using geo-based key
    limit_req_zone $binary_remote_addr zone=all_clients:20m rate=20r/s;

    # Higher rate for trusted IPv6 ranges
    geo $trusted_client {
        default     0;
        2001:db8:abcd::/48   1;
        ::1         1;
    }

    server {
        listen [::]:80 ipv6only=on;
        listen 80;

        location /api/ {
            # Skip rate limiting for trusted IPv6 clients
            if ($trusted_client = 1) {
                proxy_pass http://[2001:db8::1]:3000;
                break;
            }

            limit_req zone=all_clients burst=10 nodelay;
            proxy_pass http://[2001:db8::1]:3000;
        }
    }
}
```

## Rate Limit with Custom Error Response

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;

    server {
        location /api/ {
            limit_req zone=api burst=10 nodelay;
            limit_req_status 429;

            # Custom error page for rate limiting
            error_page 429 /rate-limit-exceeded.json;

            location = /rate-limit-exceeded.json {
                default_type application/json;
                return 429 '{"error": "Too Many Requests", "retry_after": 60}';
                add_header Retry-After 60 always;
            }

            proxy_pass http://[2001:db8::1]:3000;
        }
    }
}
```

## Test Rate Limiting

```bash
# Test rate limiting with IPv6 client

for i in {1..20}; do
    curl -6 -s -o /dev/null -w "%{http_code}\n" http://example.com/api/test
done
# Should see 200s then 429s after the burst is exceeded

# Test rate limit headers
curl -6 -v http://example.com/api/ 2>&1 | grep -E 'HTTP|Retry|X-Rate'
```

## Summary

Configure Nginx rate limiting for IPv6 with `limit_req_zone $binary_remote_addr zone=zone:10m rate=10r/s;` - this works for both IPv4 and IPv6 `$remote_addr`. Note that IPv6 clients may rotate addresses (privacy extensions), so per-address limiting may miss subnet-level abuse. Use `limit_req zone=name burst=N nodelay;` with `limit_req_status 429;` for RFC-compliant rate limit responses. Exempt trusted IPv6 subnets with `geo` module conditionals.
