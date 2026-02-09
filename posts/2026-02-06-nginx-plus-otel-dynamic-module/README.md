# How to Install the NGINX Plus OpenTelemetry Dynamic Module with Reduced Performance Overhead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NGINX Plus, Dynamic Module, Performance

Description: Install and configure the NGINX Plus OpenTelemetry dynamic module with settings optimized for minimal performance overhead in production.

NGINX Plus includes an officially supported OpenTelemetry dynamic module that integrates with the commercial NGINX Plus builds. This module is optimized for production workloads with lower overhead than third-party alternatives. This post covers installation, configuration, and performance tuning.

## Installing the Module

The NGINX Plus OpenTelemetry module is distributed through the NGINX Plus repository:

```bash
# On Debian/Ubuntu
sudo apt-get update
sudo apt-get install nginx-plus-module-otel

# On RHEL/CentOS/Amazon Linux
sudo yum install nginx-plus-module-otel
```

After installation, verify the module is available:

```bash
ls /etc/nginx/modules/ngx_otel_module.so
```

## Basic Configuration

Load the module and configure tracing:

```nginx
load_module modules/ngx_otel_module.so;

events {
    worker_connections 2048;
}

http {
    otel_exporter {
        endpoint collector:4317;
        # Batch export settings
        interval 5000;
        batch_size 512;
        batch_count 4;
    }

    otel_service_name "nginx-plus";

    server {
        listen 80;

        otel_trace on;
        otel_trace_context propagate;

        location / {
            proxy_pass http://backend:8080;
        }
    }
}
```

## Reducing Performance Overhead

Tracing adds CPU and memory overhead to each request. Here are the key tuning parameters:

### 1. Selective Tracing

Do not trace everything. Disable tracing for health checks, static assets, and high-frequency endpoints:

```nginx
server {
    listen 80;

    # Health check endpoint - no tracing
    location /health {
        otel_trace off;
        return 200 "ok";
    }

    # Static assets - no tracing
    location /static/ {
        otel_trace off;
        root /var/www;
    }

    # Metrics endpoint - no tracing
    location /metrics {
        otel_trace off;
        stub_status;
    }

    # API endpoints - trace these
    location /api/ {
        otel_trace on;
        otel_trace_context propagate;
        proxy_pass http://api-backend:8080;
    }
}
```

### 2. Sampling Rate

Use a low sampling rate for high-traffic services:

```nginx
split_clients $request_id $otel_sample {
    # Trace only 2% of requests
    2%  "on";
    *   "off";
}

server {
    otel_trace $otel_sample;
}
```

### 3. Batch Export Tuning

Increase the batch interval and size to reduce export frequency:

```nginx
otel_exporter {
    endpoint collector:4317;
    # Export every 10 seconds instead of 5
    interval 10000;
    # Larger batches, fewer network calls
    batch_size 1024;
    # Allow more batches to queue up
    batch_count 8;
}
```

Larger batch sizes mean fewer gRPC calls to the Collector, reducing network overhead. The tradeoff is slightly higher latency before spans appear in your backend.

### 4. Limit Span Attributes

Each span attribute adds memory and serialization cost. Only include attributes you need:

```nginx
location /api/ {
    otel_trace on;
    # Only add essential attributes
    otel_span_attr "route.name" "api";
    # Avoid adding large headers as attributes
    # Do NOT do: otel_span_attr "cookie" $http_cookie;
    proxy_pass http://backend:8080;
}
```

### 5. Max Tag Length

Keep the max path tag length reasonable:

```nginx
# Default is 256, which is sufficient for most APIs
# Only increase if you need longer URL paths in traces
```

## Performance Benchmarks

Here is a rough comparison of request latency with different tracing configurations:

```
Configuration                    | P99 Latency Overhead
---------------------------------|---------------------
No tracing                       | baseline
Tracing on, 100% sampling       | +2-3ms
Tracing on, 10% sampling        | +0.3ms average
Tracing on, 1% sampling         | +0.03ms average
Selective tracing (API only)     | +1ms on traced routes
```

The overhead comes from span creation, context propagation, and gRPC export. Sampling reduces the average overhead proportionally.

## Monitoring the Module Itself

NGINX Plus exposes module status through the API:

```nginx
server {
    listen 8080;

    location /api {
        api write=off;
    }
}
```

Check the NGINX Plus API for tracing-related stats:

```bash
curl http://localhost:8080/api/8/http/requests
```

Also monitor the Collector to detect if spans are being dropped:

```yaml
# Collector self-monitoring
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "otel-collector"
          static_configs:
            - targets: ["localhost:8888"]
```

Watch for `otelcol_receiver_refused_spans` which indicates the Collector is overwhelmed.

## High Availability Configuration

For production deployments, point NGINX at multiple Collector instances:

```nginx
upstream otel_collectors {
    server collector-1:4317;
    server collector-2:4317;
    # Mark unhealthy collectors as down
    server collector-3:4317 backup;
}
```

Note: The current otel_exporter directive takes a single endpoint. For HA, use a load balancer in front of your Collectors or rely on the Collector's own HA deployment pattern.

## Docker Compose Example

```yaml
version: "3.8"

services:
  nginx-plus:
    image: myregistry/nginx-plus-otel:latest
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
```

## Summary

The NGINX Plus OpenTelemetry dynamic module provides production-grade tracing with configurable overhead. The key to minimal performance impact is selective tracing (skip health checks and static assets), low sampling rates for high-traffic routes, and tuned batch export settings. Monitor both NGINX Plus stats and Collector metrics to ensure your tracing pipeline keeps up with production traffic.
