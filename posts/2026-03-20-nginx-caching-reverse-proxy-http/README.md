# How to Set Up a Caching Reverse Proxy with Nginx for HTTP Content

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, Caching, Reverse Proxy, Performance, HTTP, Web Server

Description: Learn how to configure Nginx as a caching reverse proxy to reduce upstream load and accelerate HTTP content delivery.

## Why Cache at the Proxy Layer?

Caching at Nginx means repeated requests for the same content never hit your application server. This reduces latency, cuts upstream CPU/DB load, and protects against traffic spikes-all without changing application code.

## Defining a Cache Zone

Cache configuration is set in the `http` block:

```nginx
# /etc/nginx/nginx.conf

http {
    # Define cache path, directory levels, shared memory zone name and size,
    # inactive eviction time, and maximum cache size on disk
    proxy_cache_path /var/cache/nginx
                     levels=1:2
                     keys_zone=app_cache:10m
                     inactive=60m
                     max_size=1g;

    # Cache key: scheme + method + host + URI
    proxy_cache_key "$scheme$request_method$host$request_uri";
}
```

## Configuring the Proxy Server Block

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Enable caching using the defined zone
        proxy_cache app_cache;

        # Cache successful responses for 10 minutes
        proxy_cache_valid 200 302 10m;

        # Cache 404s briefly to avoid hammering upstream
        proxy_cache_valid 404 1m;

        # Serve stale content if upstream is down or slow
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;

        # Add cache status header (MISS, BYPASS, EXPIRED, STALE, UPDATING, REVALIDATED, HIT)
        add_header X-Cache-Status $upstream_cache_status;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Bypassing the Cache for Authenticated Requests

```nginx
server {
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;

        # Bypass cache if Authorization header or session cookie present
        proxy_cache_bypass $http_authorization $cookie_session;
        proxy_no_cache     $http_authorization $cookie_session;

        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

## Forcing Cache Revalidation

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_cache app_cache;

    # Respect Cache-Control headers from upstream
    proxy_cache_valid 200 5m;

    # Lock concurrent requests for the same resource to single upstream call
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;
}
```

`proxy_cache_lock` prevents cache stampedes by serializing simultaneous requests for an uncached resource.

## Purging Cache Entries

Nginx open-source does not have a built-in purge module, but you can invalidate by rewriting cache keys or using the commercial Plus module. A simple workaround is to reload config or clear the cache directory:

```bash
# Clear all cached files (restart nginx after)
rm -rf /var/cache/nginx/*
nginx -s reload
```

## Monitoring Cache Performance

```bash
# Count HITs and MISSes in access log
awk '{print $NF}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

Add `$upstream_cache_status` to your log format:

```nginx
log_format cache_log '$remote_addr - $request - $status - $upstream_cache_status';
access_log /var/log/nginx/access.log cache_log;
```

## Conclusion

Nginx's proxy cache is powerful and straightforward to configure. Define a `proxy_cache_path`, reference it in your location block, and use `proxy_cache_bypass` to skip the cache for private content. The `X-Cache-Status` header makes debugging cache behavior easy.
