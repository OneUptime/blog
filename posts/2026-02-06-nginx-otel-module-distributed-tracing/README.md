# How to Configure the NGINX ngx_otel_module for Distributed Tracing with OTLP gRPC Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NGINX, Distributed Tracing, ngx_otel_module

Description: Configure the NGINX ngx_otel_module to enable distributed tracing with OTLP gRPC export to the OpenTelemetry Collector for request visibility.

NGINX supports OpenTelemetry through the `ngx_otel_module`, a native module that generates spans for each HTTP request processed by NGINX. The module exports spans via OTLP gRPC to an OpenTelemetry Collector. This post covers installation, configuration, and practical usage of the module.

## Installing the Module

The `ngx_otel_module` is available as a dynamic module. For NGINX installed from the official repo:

```bash
# On Debian/Ubuntu
sudo apt-get install nginx-module-otel

# On RHEL/CentOS
sudo yum install nginx-module-otel
```

If you build NGINX from source, compile the module:

```bash
git clone https://github.com/nginxinc/nginx-otel.git
cd nginx-otel
mkdir build && cd build
cmake -DNGX_OTEL_NGINX_BUILD_DIR=/path/to/nginx/objs ..
make
```

## Loading the Module

Add the module to the top of your `nginx.conf`:

```nginx
# Load the OpenTelemetry module
load_module modules/ngx_otel_module.so;

events {
    worker_connections 1024;
}

http {
    # Configure the OpenTelemetry exporter
    otel_exporter {
        endpoint localhost:4317;
    }

    # Set the service name for all traces
    otel_service_name "nginx-proxy";

    server {
        listen 80;
        server_name example.com;

        # Enable tracing for this server block
        otel_trace on;

        location /api/ {
            # Trace context propagates to the upstream
            otel_trace_context propagate;
            proxy_pass http://backend:8080;
        }

        location /static/ {
            # Disable tracing for static content
            otel_trace off;
            root /var/www/html;
        }
    }
}
```

## Understanding the Configuration Directives

### otel_exporter
Defines the OTLP gRPC endpoint:

```nginx
otel_exporter {
    endpoint collector:4317;
    # Export interval in milliseconds
    interval 5000;
    # Maximum batch size
    batch_size 512;
    # Maximum queue size before dropping spans
    batch_count 4;
}
```

### otel_trace
Controls whether tracing is active for a location:

```nginx
# Enable tracing
otel_trace on;

# Disable tracing
otel_trace off;

# Use a variable for dynamic control
otel_trace $otel_trace;
```

### otel_trace_context
Controls how trace context is handled:

```nginx
# Propagate incoming trace context and create child spans
otel_trace_context propagate;

# Extract but do not propagate (read-only)
otel_trace_context extract;

# Inject new trace context (ignore incoming)
otel_trace_context inject;

# Ignore all trace context
otel_trace_context ignore;
```

## Setting Custom Span Attributes

Add custom attributes to the spans:

```nginx
http {
    otel_exporter {
        endpoint collector:4317;
    }

    otel_service_name "nginx-proxy";

    server {
        listen 80;

        otel_trace on;
        otel_trace_context propagate;

        # Add custom span attributes
        otel_span_attr "http.server.name" "nginx-frontend";
        otel_span_attr "deployment.environment" "production";

        location /api/v2/ {
            # Route-specific attributes
            otel_span_attr "api.version" "v2";
            otel_span_attr "route.name" "api-v2";
            proxy_pass http://backend-v2:8080;
        }

        location /api/v1/ {
            otel_span_attr "api.version" "v1";
            otel_span_attr "route.name" "api-v1";
            proxy_pass http://backend-v1:8080;
        }
    }
}
```

## Configuring Sampling

Control the sampling rate using the `otel_trace` directive with a variable:

```nginx
http {
    otel_exporter {
        endpoint collector:4317;
    }

    otel_service_name "nginx-proxy";

    # Map to create a sampling variable
    # Split traffic: sample 10% of requests
    split_clients $request_id $otel_sample {
        10% "on";
        *   "off";
    }

    server {
        listen 80;

        # Use the sampling variable
        otel_trace $otel_sample;
        otel_trace_context propagate;

        location / {
            proxy_pass http://backend:8080;
        }
    }
}
```

For parent-based sampling (always trace if the parent is sampled):

```nginx
# Always trace if traceparent header is present, otherwise sample 10%
map $http_traceparent $otel_parent_sample {
    default "on";
    ""      $otel_sample;
}

server {
    otel_trace $otel_parent_sample;
}
```

## Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: service.type
        value: "web-server"
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Docker Setup

```dockerfile
# Dockerfile for NGINX with OpenTelemetry
FROM nginx:latest

# Install the OTel module
RUN apt-get update && apt-get install -y nginx-module-otel && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf
```

## Testing

```bash
# Start NGINX and the Collector
docker compose up -d

# Send a traced request
curl -H "traceparent: 00-abcdef0123456789abcdef0123456789-0123456789abcdef-01" \
     http://localhost/api/v2/users

# Check Collector logs
docker logs otel-collector
```

## Summary

The `ngx_otel_module` adds native OpenTelemetry tracing to NGINX. Load the module, configure the exporter endpoint, and enable tracing per server or location block. Use `otel_trace_context propagate` to forward trace context to upstream services. Configure sampling through NGINX variables for fine-grained control over which requests get traced. Custom span attributes add context specific to your routes and deployment.
