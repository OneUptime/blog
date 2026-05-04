# How to Configure KrakenD API Gateway for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: KrakenD, API Gateway, IPv6, Networking, Go, Configuration

Description: Configure KrakenD CE and EE to bind to IPv6 addresses and proxy requests to IPv6 upstream backends using the krakend.json configuration file.

## Introduction

KrakenD is a stateless, high-performance API Gateway written in Go. Like other Go applications, it natively supports IPv6. Enabling IPv6 requires updating the port binding and backend URL definitions in `krakend.json`.

## Prerequisites

- KrakenD CE 2.x or EE installed
- An IPv6-enabled network interface
- Basic familiarity with JSON configuration

## Step 1: Configure the Listener Address

KrakenD uses the `port` key for its TCP listener and the `listen_ip` key to choose which interface (IPv4 or IPv6) the server binds to. An empty string listens on all interfaces.

```json
{
  "$schema": "https://www.krakend.io/schema/v3.json",
  "version": 3,
  "name": "KrakenD IPv6 Gateway",
  "port": 8080,
  "listen_ip": "",
  "timeout": "3000ms",
  "cache_ttl": "300s",
  "extra_config": {
    "security/cors": {
      "allow_origins": ["*"]
    }
  },
  "endpoints": []
}
```

To bind exclusively to all IPv6 interfaces, set `listen_ip` to `::` (no brackets, port is configured separately):

```json
{
  "port": 8080,
  "listen_ip": "::"
}
```

To bind to a single IPv6 address:

```json
{
  "port": 8080,
  "listen_ip": "2001:db8::68"
}
```

## Step 2: Define Endpoints with IPv6 Backends

Each endpoint's `backend` block specifies the upstream host. Use bracket notation for IPv6 hosts.

```json
{
  "endpoints": [
    {
      "endpoint": "/api/users",
      "method": "GET",
      "output_encoding": "json",
      "backend": [
        {
          "url_pattern": "/users",
          // IPv6 host in bracket notation
          "host": ["http://[2001:db8::10]:8080"],
          "encoding": "json",
          "method": "GET",
          "extra_config": {
            "backend/http": {
              "return_error_details": "backend_alias"
            }
          }
        }
      ]
    },
    {
      "endpoint": "/api/orders",
      "method": "GET",
      "output_encoding": "json",
      "backend": [
        {
          "url_pattern": "/orders",
          // Load balance across multiple IPv6 backends
          "host": [
            "http://[2001:db8::10]:8081",
            "http://[2001:db8::11]:8081"
          ],
          "encoding": "json"
        }
      ]
    }
  ]
}
```

## Step 3: Run KrakenD

```bash
# Validate the configuration

krakend check -c krakend.json

# Run the gateway
krakend run -c krakend.json

# Or with the official Docker image, exposing IPv6
docker run -d --name krakend \
  -v $(pwd)/krakend.json:/etc/krakend/krakend.json \
  -p 8080:8080 \
  krakend run -c /etc/krakend/krakend.json
```

## Step 4: Verify IPv6 Connectivity

```bash
# Check that KrakenD is listening on IPv6
ss -tlnp | grep 8080

# Test an endpoint over IPv6
curl -6 http://[::1]:8080/api/users

# Test from an IPv6 client address
curl -6 -H "X-Forwarded-For: 2001:db8::100" \
  http://[::1]:8080/api/users
```

## Step 5: Enable Metrics over IPv6

KrakenD exposes a metrics endpoint that you can scrape over IPv6.

```json
{
  "extra_config": {
    "telemetry/metrics": {
      "collection_time": "60s",
      "proxy_disabled": false,
      "router_disabled": false,
      // Metrics listen address - bind to IPv6
      "listen_address": "[::]:8090"
    }
  }
}
```

```bash
# Scrape metrics over IPv6
curl -6 http://[::1]:8090/__stats/
```

## Conclusion

KrakenD's JSON-driven configuration makes IPv6 enablement straightforward. The key changes are setting `listen_ip` for the listener and wrapping backend IPv6 addresses in square brackets. Track your KrakenD gateway performance across both IP stacks with OneUptime.
