# How to Configure Apache Timeout and ProxyTimeout for IPv4 Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Timeout, ProxyTimeout, IPv4, Reverse Proxy, Performance, mod_proxy

Description: Configure Apache's Timeout and ProxyTimeout directives to control how long requests wait for IPv4 backend responses, preventing hanging connections from exhausting server resources.

## Introduction

Apache's timeout settings control how long it waits for client requests, backend responses, and data transfers. Misconfigured timeouts can cause two problems: timeouts too low cause premature failures for legitimate slow requests; timeouts too high allow hanging connections to exhaust Apache's MaxRequestWorkers, making the server unresponsive.

## Apache Timeout Settings

| Setting | Controls | Default |
|-----------|---------|---------|
| `Timeout` | General I/O timeout for client reads/writes; default for `ProxyTimeout` | 60s |
| `ProxyTimeout` | Network timeout for proxied requests | Uses `Timeout` |
| `connectiontimeout` | Timeout establishing the backend connection (`ProxyPass`/worker parameter) | Uses worker `timeout` |
| `KeepAliveTimeout` | Idle keepalive connection timeout | 5s |

## Setting Global Timeout

```apache
# /etc/apache2/apache2.conf

# General I/O timeout for client reads/writes
# Also used as the default for proxied requests if ProxyTimeout is not set
Timeout 30

# Keep-alive timeout for persistent connections
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
```

## Configuring ProxyTimeout

`ProxyTimeout` sets the network timeout Apache uses for proxied requests to the backend (IPv4 server):

```apache
# /etc/apache2/sites-available/myapp.conf

<VirtualHost *:80>
    ServerName app.example.com
    
    # Reverse proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Network timeout for proxied requests to the backend
    # Set this above the longest expected idle gap while the backend is working
    ProxyTimeout 120
    
    # Timeout establishing the backend TCP connection
    ProxyPass / http://10.0.0.5:8080/ connectiontimeout=10
    ProxyPassReverse / http://10.0.0.5:8080/
</VirtualHost>
```

## Path-Specific Timeout Overrides

Set different backend timeouts for different endpoints by creating separate `ProxyPass` mappings:

```apache
<VirtualHost *:443>
    ServerName api.example.com
    
    # Put longer, more specific paths before "/"
    # Long-running report endpoint: allow up to 10 minutes
    ProxyPass /api/reports http://10.0.0.5:8080/api/reports timeout=600
    ProxyPassReverse /api/reports http://10.0.0.5:8080/api/reports
    
    # File upload: allow longer backend processing time
    ProxyPass /api/upload http://10.0.0.5:8080/api/upload timeout=600
    ProxyPassReverse /api/upload http://10.0.0.5:8080/api/upload
    
    # Health check: short timeout only
    ProxyPass /health http://10.0.0.5:8080/health timeout=5
    ProxyPassReverse /health http://10.0.0.5:8080/health
    
    # Default: short timeout for most API endpoints
    ProxyPass / http://10.0.0.5:8080/ timeout=30
    ProxyPassReverse / http://10.0.0.5:8080/

    # If slow clients upload large bodies, configure RequestReadTimeout
    # separately at server or virtual-host scope.
</VirtualHost>
```

## RequestReadTimeout for Slow Clients

`RequestReadTimeout` sets timeouts for the client-to-Apache phase:

```apache
# /etc/apache2/conf-available/request-timeout.conf

<IfModule mod_reqtimeout.c>
    # Allow 20-40s for request headers, and at least 20s for the body
    # MinRate=500 adds 1 second of timeout for each 500 bytes received
    RequestReadTimeout header=20-40,MinRate=500 body=20,MinRate=500
</IfModule>
```

## Configuring Timeouts for mod_proxy_balancer

When using a balancer with multiple backends:

```apache
<Proxy "balancer://mycluster">
    BalancerMember http://10.0.0.5:8080 timeout=30
    BalancerMember http://10.0.0.6:8080 timeout=30
    
    # After a worker enters error state, wait 30s before retrying it
    # BalancerMember ... retry=30
</Proxy>

<VirtualHost *:80>
    ProxyTimeout 60
    ProxyPass / balancer://mycluster/
    ProxyPassReverse / balancer://mycluster/
</VirtualHost>
```

## Monitoring Timeout Events

```bash
# Check Apache error log for timeout-related errors
sudo grep -i timeout /var/log/apache2/error.log

# Watch live
sudo tail -f /var/log/apache2/error.log | grep -Ei "timeout|proxy"

# Exact timeout messages vary by proxy module and backend protocol.
# Search for "timeout", "proxy", and AH01xxx error codes in the log.
```

## Recommended Settings by Workload

| Use Case | Timeout | ProxyTimeout |
|---------|---------|-------------|
| REST API (fast) | 30s | 30s |
| Web application | 60s | 60s |
| Report generation | 60s | 300s |
| File upload/download | 120s | 600s |
| Long-poll / SSE | 60s | 3600s |

## Conclusion

Properly tuned timeouts prevent Apache from holding resources on stuck connections while allowing legitimate slow operations to complete. Use `ProxyTimeout` for proxied backend I/O timeouts, `RequestReadTimeout` for client-side timeouts, and set path-specific proxy mappings for endpoints with unusual latency requirements.
