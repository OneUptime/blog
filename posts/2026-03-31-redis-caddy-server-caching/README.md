# How to Use Redis with Caddy Server for Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caddy, Caching

Description: Learn how to add Redis-backed HTTP response caching to Caddy Server using the cache-handler plugin to serve repeated requests from memory instead of hitting backends.

---

Caddy Server handles HTTPS automatically, but it does not cache responses out of the box. The `cache-handler` plugin adds HTTP caching support and can use Redis as the storage backend. This lets you cache API responses or static assets across Caddy instances.

## Install the Cache Plugin

Build Caddy with the `cache-handler` module using `xcaddy`:

```bash
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
xcaddy build \
  --with github.com/caddyserver/cache-handler
```

## Start Redis

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## Caddyfile Configuration

Configure Caddy to use the Souin cache middleware with Redis:

```text
{
    cache {
        ttl 5m
        stale 2m
        redis {
            url 127.0.0.1:6379
        }
    }
}

api.example.com {
    cache {
        ttl 300s
        key {
            headers X-User-ID
        }
    }
    reverse_proxy localhost:8080
}
```

The `key` block customizes the cache key. Including headers like `X-User-ID` lets you cache per-user responses.

## JSON Configuration (Alternative)

If you use Caddy's JSON config instead of Caddyfile:

```text
{
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "routes": [{
            "handle": [{
              "handler": "subroute",
              "routes": [{
                "handle": [{
                  "handler": "cache",
                  "ttl": "5m",
                  "redis": {
                    "configuration": {
                      "InitAddress": ["127.0.0.1:6379"]
                    }
                  }
                }]
              }]
            }]
          }]
        }
      }
    }
  }
}
```

## Verifying Cached Responses

Make two requests and observe the cache header:

```bash
curl -I https://api.example.com/data
# Cache-Status: Souin; fwd=uri-miss

curl -I https://api.example.com/data
# Cache-Status: Souin; hit
```

Inspect the cached entry in Redis:

```bash
redis-cli keys "GET-*"
redis-cli get "GET-https-api.example.com-/data"
```

## Cache Invalidation

Use Souin's built-in API to invalidate cache entries. The API is available at `/souin-api/souin/` by default:

```bash
# Purge a specific path pattern
curl -X PURGE https://api.example.com/souin-api/souin/data

# Flush all cached entries
curl -X PURGE https://api.example.com/souin-api/souin/flush
```

Or expire keys directly in Redis:

```bash
redis-cli del "GET-https-api.example.com-/data"
```

## Summary

Redis-backed caching in Caddy via the Souin/cache-handler plugin reduces backend load by storing HTTP responses in Redis. The Caddyfile configuration is straightforward, and the plugin supports per-header cache keys, TTL management, and PURGE endpoints. Combined with Caddy's automatic HTTPS, this gives you a capable reverse proxy with centralized caching in a compact setup.
