# How to Configure gRPC with Nginx as an IPv4 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Nginx, IPv4, Reverse Proxy, TLS, Networking

Description: Learn how to configure Nginx as an IPv4 reverse proxy for gRPC services, including HTTP/2 passthrough, TLS termination, load balancing, and gRPC-specific health check error handling.

## Basic gRPC Proxy (HTTP/2 Plain-Text)

```nginx
# /etc/nginx/sites-available/grpc

upstream grpc_backend {
    server 127.0.0.1:50051;
    keepalive 32;
}

server {
    listen 50052;
    http2 on;              # gRPC requires HTTP/2
    server_name grpc.internal;

    location / {
        grpc_pass grpc://grpc_backend;

        # Return gRPC UNAVAILABLE (14) on upstream errors
        error_page 502 = /grpc_error;
    }

    location = /grpc_error {
        internal;
        default_type application/grpc;
        add_header grpc-status 14;
        add_header content-length 0;
        return 204;
    }
}
```

## gRPC with TLS Termination

```nginx
upstream grpc_backend {
    server 127.0.0.1:50051;
    keepalive 32;
}

server {
    listen 443 ssl;
    http2 on;
    server_name grpc.example.com;

    ssl_certificate     /etc/ssl/grpc.crt;
    ssl_certificate_key /etc/ssl/grpc.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        # Backend is plain HTTP/2 (no TLS between Nginx and backend)
        grpc_pass grpc://grpc_backend;
        grpc_set_header Host $host;
        grpc_set_header X-Real-IP $remote_addr;
        grpc_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        error_page 502 = /grpc_error;
    }

    location = /grpc_error {
        internal;
        default_type application/grpc;
        add_header grpc-status 14;
        add_header content-length 0;
        return 204;
    }
}
```

## gRPC with mTLS Termination

```nginx
upstream grpc_backend {
    server 127.0.0.1:50051;
    keepalive 32;
}

server {
    listen 443 ssl;
    http2 on;

    ssl_certificate     /etc/ssl/server.crt;
    ssl_certificate_key /etc/ssl/server.key;
    ssl_client_certificate /etc/ssl/ca.crt;
    ssl_verify_client   on;

    location / {
        grpc_pass grpc://grpc_backend;
        # Forward client subject DN to backend
        grpc_set_header X-Client-Subject-DN $ssl_client_s_dn;
    }
}
```

## Load Balancing Multiple gRPC Backends

```nginx
upstream grpc_pool {
    least_conn;
    server 10.0.0.1:50051;
    server 10.0.0.2:50051;
    server 10.0.0.3:50051;
    keepalive 64;   # persistent connections to backends
}

server {
    listen 50051;
    http2 on;

    location / {
        grpc_pass grpc://grpc_pool;
        grpc_read_timeout  60s;
        grpc_send_timeout  60s;
        grpc_connect_timeout 5s;
    }
}
```

## Nginx Directive Reference

| Directive | Purpose |
|-----------|---------|
| `http2 on` | Enable HTTP/2 in the server block (required for gRPC) |
| `grpc_pass grpc://` | Proxy to plain-text HTTP/2 backend |
| `grpc_pass grpcs://` | Proxy to TLS backend |
| `grpc_set_header` | Set request header forwarded to backend |
| `grpc_read_timeout` | Timeout for reading response from backend |
| `keepalive N` | Persistent connections to upstream pool |

## Conclusion

Nginx supports gRPC proxying natively with `grpc_pass` when HTTP/2 is enabled. TLS termination decouples certificate management from the gRPC service - the backend runs plain HTTP/2 while clients see a valid TLS server. Use `keepalive` in the upstream block to reuse connections to backends (gRPC channels map to HTTP/2 connections). Return gRPC status `14` (UNAVAILABLE) from the `error_page` handler so clients receive a proper gRPC error instead of an HTTP 502 response.
