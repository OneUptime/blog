# How to Configure Tyk API Definitions for Rate Limiting and Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tyk, API Gateway, Rate Limiting

Description: Learn how to configure Tyk API definitions with rate limiting and quota policies to control API usage, prevent abuse, and implement tiered access levels for different consumer classes.

---

Tyk provides sophisticated rate limiting and quota management through API definitions and policies. Rate limits control request frequency per time window, while quotas cap total requests over longer periods. These controls protect backend services from overload, enable fair usage across consumers, and support monetization through tiered access levels.

## Understanding Tyk Rate Limiting

Tyk supports multiple rate limiting strategies:

**Per-API rate limits** - Apply to all consumers of an API
**Per-key rate limits** - Different limits for each API key
**Policy-based limits** - Group keys under policies with shared limits
**Endpoint-specific limits** - Different limits for different paths

Rate limits are enforced using Redis counters, enabling consistent limits across distributed gateway instances.

## Basic Rate Limiting in API Definitions

Configure per-API rate limiting:

```json
{
  "name": "Rate Limited API",
  "api_id": "rate-limited-api",
  "org_id": "default",
  "use_keyless": false,
  "auth": {
    "auth_header_name": "Authorization"
  },
  "proxy": {
    "listen_path": "/api/",
    "target_url": "http://backend.default.svc.cluster.local:8080/",
    "strip_listen_path": true
  },
  "global_rate_limit": {
    "rate": 100,
    "per": 60
  },
  "active": true
}
```

This limits all traffic to 100 requests per 60 seconds globally across all consumers.

## Per-Key Rate Limiting

Create keys with individual rate limits:

```json
{
  "allowance": 1000,
  "rate": 1000,
  "per": 60,
  "expires": 0,
  "quota_max": 10000,
  "quota_renews": 1672531200,
  "quota_remaining": 10000,
  "quota_renewal_rate": 86400,
  "access_rights": {
    "rate-limited-api": {
      "api_name": "Rate Limited API",
      "api_id": "rate-limited-api",
      "versions": ["Default"],
      "allowed_urls": []
    }
  },
  "org_id": "default",
  "meta_data": {
    "tier": "premium"
  }
}
```

Create the key via API:

```bash
curl http://localhost:8080/tyk/keys \
  -H "X-Tyk-Authorization: your-secret-key" \
  -H "Content-Type: application/json" \
  -d @key-definition.json

# Returns: {"key":"eyJvcmciOiI1ZTlkOTU0NGE1M...","status":"ok","action":"added"}
```

## Policy-Based Rate Limiting

Define policies with rate limits:

```json
{
  "name": "Gold Tier Policy",
  "id": "gold-tier",
  "org_id": "default",
  "rate": 5000,
  "per": 60,
  "quota_max": 50000,
  "quota_renewal_rate": 86400,
  "access_rights": {
    "rate-limited-api": {
      "api_name": "Rate Limited API",
      "api_id": "rate-limited-api",
      "versions": ["Default"],
      "allowed_urls": [],
      "limit": {
        "rate": 5000,
        "per": 60,
        "throttle_interval": -1,
        "throttle_retry_limit": -1,
        "max_query_depth": -1,
        "quota_max": 50000,
        "quota_renews": 1672531200,
        "quota_remaining": 50000,
        "quota_renewal_rate": 86400
      }
    }
  },
  "state": "active"
}
```

Create multiple tier policies:

```bash
# Gold tier: 5000 req/min
curl http://localhost:8080/tyk/policies \
  -H "X-Tyk-Authorization: your-secret-key" \
  -H "Content-Type: application/json" \
  -d @gold-policy.json

# Silver tier: 1000 req/min
curl http://localhost:8080/tyk/policies \
  -H "X-Tyk-Authorization: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Silver Tier Policy",
    "id": "silver-tier",
    "rate": 1000,
    "per": 60,
    "quota_max": 10000,
    "quota_renewal_rate": 86400,
    "access_rights": {...}
  }'

# Bronze tier: 100 req/min
curl http://localhost:8080/tyk/policies \
  -H "X-Tyk-Authorization: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bronze Tier Policy",
    "id": "bronze-tier",
    "rate": 100,
    "per": 60,
    "quota_max": 1000,
    "quota_renewal_rate": 86400,
    "access_rights": {...}
  }'
```

Create keys with policies:

```bash
# Create gold tier key
curl http://localhost:8080/tyk/keys \
  -H "X-Tyk-Authorization: your-secret-key" \
  -d '{
    "apply_policies": ["gold-tier"]
  }'
```

## Endpoint-Specific Rate Limiting

Apply different limits to different paths:

```json
{
  "name": "Endpoint Limited API",
  "api_id": "endpoint-limited",
  "proxy": {
    "listen_path": "/api/",
    "target_url": "http://backend.default.svc.cluster.local:8080/"
  },
  "version_data": {
    "not_versioned": true,
    "versions": {
      "Default": {
        "name": "Default",
        "use_extended_paths": true,
        "extended_paths": {
          "rate_limit": [
            {
              "path": "/search",
              "method": "GET",
              "rate": 10,
              "per": 60
            },
            {
              "path": "/write",
              "method": "POST",
              "rate": 5,
              "per": 60
            },
            {
              "path": "/read",
              "method": "GET",
              "rate": 100,
              "per": 60
            }
          ]
        }
      }
    }
  }
}
```

## Quota Management

Configure daily quotas:

```json
{
  "quota_max": 10000,
  "quota_renewal_rate": 86400,
  "quota_renews": 1672531200,
  "quota_remaining": 10000
}
```

Quota parameters:
- `quota_max`: Total requests allowed in the quota period
- `quota_renewal_rate`: Seconds until quota resets (86400 = 24 hours)
- `quota_renews`: Unix timestamp when quota next resets
- `quota_remaining`: Current remaining quota

## Burst Allowance

Configure burst limits to handle traffic spikes:

```json
{
  "rate": 100,
  "per": 60,
  "throttle_interval": 1,
  "throttle_retry_limit": 10
}
```

This allows up to 10 requests in 1-second bursts, while maintaining 100 req/min average.

## Rate Limit Response Headers

Tyk automatically adds rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 423
X-RateLimit-Reset: 1672531200
```

Configure header names:

```json
{
  "response_processors": [
    {
      "name": "header_injector",
      "options": {
        "add_headers": {
          "X-Custom-Rate-Limit": "$rate_limit",
          "X-Custom-Rate-Remaining": "$rate_remaining"
        }
      }
    }
  ]
}
```

## Rate Limiting by Client IP

Use IP-based rate limiting for keyless APIs:

```json
{
  "name": "IP Rate Limited API",
  "use_keyless": true,
  "enable_ip_blacklisting": false,
  "enable_ip_whitelisting": false,
  "global_rate_limit": {
    "rate": 10,
    "per": 60
  },
  "auth": {
    "use_param": false,
    "use_cookie": false
  }
}
```

## Dynamic Rate Limits via Middleware

Implement custom rate limit logic:

```javascript
// rate-limit-middleware.js
function rateLimit(request, session, config) {
  // Check user tier from metadata
  var tier = session.meta_data.tier;

  // Set limits based on tier
  if (tier === "premium") {
    session.rate = 5000;
    session.per = 60;
  } else if (tier === "standard") {
    session.rate = 1000;
    session.per = 60;
  } else {
    session.rate = 100;
    session.per = 60;
  }

  return request, session;
}
```

## Monitoring Rate Limits

Check key quota and rate limit status:

```bash
# Get key details
curl http://localhost:8080/tyk/keys/{key-id} \
  -H "X-Tyk-Authorization: your-secret-key"

# Response includes:
# {
#   "rate": 1000,
#   "per": 60,
#   "quota_remaining": 8523,
#   "quota_renews": 1672617600
# }
```

Monitor rate limit hits in analytics:

```bash
# Query Redis for rate limit counters
kubectl exec -it redis-0 -n tyk -- redis-cli KEYS "rate-limit-*"
```

## Handling Rate Limit Exceeded

When limits are exceeded, Tyk returns HTTP 429:

```json
{
  "error": "Rate limit exceeded"
}
```

Configure custom error response:

```json
{
  "custom_middleware": {
    "post": [
      {
        "name": "CustomRateLimitError",
        "path": "middleware/rate_limit_error.js"
      }
    ]
  }
}
```

## Testing Rate Limits

Test rate limiting behavior:

```bash
TYK_GATEWAY=$(kubectl get svc tyk-gateway -n tyk -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
API_KEY="your-api-key"

# Make rapid requests
for i in {1..150}; do
  curl -i http://${TYK_GATEWAY}:8080/api/test \
    -H "Authorization: ${API_KEY}" \
    -w "\nRequest $i: %{http_code}\n"
  sleep 0.1
done

# First 100 return 200, then 429
```

## Rate Limit Analytics

Query rate limit metrics:

```bash
# Get key analytics
curl "http://localhost:8080/tyk/keys/{key-id}?api_id={api-id}" \
  -H "X-Tyk-Authorization: your-secret-key"
```

Export to external systems via Tyk Pump:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tyk-pump-config
  namespace: tyk
data:
  pump.conf: |
    {
      "pumps": {
        "prometheus": {
          "type": "prometheus",
          "meta": {
            "listen_address": ":9090",
            "path": "/metrics"
          }
        }
      }
    }
```

## Best Practices

**Start with conservative limits** - Begin with higher limits and reduce based on monitoring.

**Use policies for user tiers** - Simplify management by grouping similar users.

**Monitor quota usage** - Alert users before quotas are exhausted.

**Implement graceful degradation** - Return cached responses when rate limited rather than errors.

**Document limits clearly** - Communicate rate limits to API consumers.

**Provide quota APIs** - Let users query their remaining quota programmatically.

**Use Redis persistence** - Ensure rate limit counters survive restarts.

**Test limit enforcement** - Verify limits work correctly under load.

## Conclusion

Tyk's rate limiting and quota management provides flexible controls for protecting APIs while enabling tiered access models. By supporting per-API, per-key, and policy-based limits with Redis-backed counters, Tyk enables consistent enforcement across distributed gateway instances. Combined with endpoint-specific limits and quota management, teams can implement sophisticated usage controls that balance protection, fairness, and monetization objectives while maintaining high gateway performance.
