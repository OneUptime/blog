# How to Configure HTTP Frontends for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, HTTP, S3, Object Storage

Description: Learn how to configure HTTP frontends for Ceph RADOS Gateway (RGW), including beast and civetweb options, SSL termination, and performance tuning.

---

## Overview

Ceph RADOS Gateway (RGW) serves S3 and Swift object storage APIs via an HTTP frontend. The default frontend is `beast` (an Asio-based HTTP server), though `civetweb` is also available. Proper frontend configuration affects connection handling capacity, TLS, and overall gateway performance.

## Available HTTP Frontends

Ceph RGW supports two built-in HTTP frontends:

- **beast** - Default, high-performance frontend based on Boost.Asio
- **civetweb** - Alternative embedded web server, simpler configuration (deprecated in Pacific, removed in Quincy and later)

## Configuring the Beast Frontend

Set frontend options in `ceph.conf` or via `ceph config set`:

```bash
# Set beast as the frontend (default)
ceph config set client.rgw.default rgw_frontends \
  "beast port=8080 ssl_port=443 ssl_certificate=/etc/ceph/rgw.crt ssl_private_key=/etc/ceph/rgw.key"

# View current frontend config
ceph config get client.rgw.default rgw_frontends
```

## Configuring SSL/TLS

Generate or provide a certificate and configure SSL:

```bash
# Generate self-signed certificate for testing
openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/ceph/rgw.key \
  -out /etc/ceph/rgw.crt \
  -days 365 -nodes \
  -subj "/CN=rgw.example.com"

# Configure RGW to use SSL
ceph config set client.rgw.default rgw_frontends \
  "beast ssl_port=443 ssl_certificate=/etc/ceph/rgw.crt ssl_private_key=/etc/ceph/rgw.key"
```

## Tuning Connection Limits

```bash
# Set max concurrent connections
ceph config set client.rgw.default rgw_thread_pool_size 512

# Set max chunk size for data operations (default 4MB)
ceph config set client.rgw.default rgw_max_chunk_size 4194304  # 4MB
```

## Rook: Configuring the Gateway via CephObjectStore

In Rook, RGW frontend settings are in the `CephObjectStore` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  preservePoolsOnDelete: true
  gateway:
    port: 80
    securePort: 443
    instances: 2
    sslCertificateRef: rgw-tls-secret
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        memory: 2Gi
```

Create the TLS secret for SSL:

```bash
kubectl create secret tls rgw-tls-secret \
  --cert=rgw.crt \
  --key=rgw.key \
  -n rook-ceph
```

## HTTP/1.1 Keep-Alive

The beast frontend supports HTTP/1.1 keep-alive by default. You can tune the request timeout, which governs how long beast waits for data on idle connections:

```bash
# Set request timeout in milliseconds (default 65000ms)
ceph config set client.rgw.default rgw_frontends \
  "beast port=8080 request_timeout_ms=65000"
```

## Verifying the Frontend Configuration

```bash
# Test HTTP endpoint
curl -v http://rgw-host:8080/

# Test HTTPS endpoint
curl -vk https://rgw-host:443/

# Check RGW frontend config
ceph config get client.rgw.default rgw_frontends
```

## Summary

Ceph RGW uses the beast HTTP frontend by default, configurable via `rgw_frontends` in the Ceph configuration. SSL/TLS can be enabled by specifying `ssl_port` and certificate paths. In Rook environments, gateway settings including TLS are managed through the `CephObjectStore` gateway spec. Tune `rgw_thread_pool_size` and related parameters to match your expected connection load.
