# How to Connect Grafana to Datasources via Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Proxy, Datasources, Security, Networking

Description: Learn how to configure Grafana to connect to datasources through HTTP proxies, SOCKS proxies, and corporate firewalls for secure data access in restricted networks.

---

When Grafana runs in a restricted network or behind a corporate firewall, connecting to external datasources requires proxy configuration. This guide covers HTTP proxies, SOCKS proxies, and various authentication methods for secure datasource connectivity.

## Understanding Grafana Proxy Architecture

Grafana can route datasource traffic through proxies at multiple levels: environment variables, Grafana's secure SOCKS5 datasource proxy, or through a dedicated proxy server.

```mermaid
flowchart LR
    A[Grafana Server] -->|Proxy Request| B[HTTP/SOCKS Proxy]
    B -->|Forward| C[External Datasource]
    C -->|Response| B
    B -->|Return| A

    subgraph Corporate Network
        A
        B
    end

    subgraph External
        C
    end
```

## 1. Configure Global Proxy via Environment Variables

The simplest approach sets proxy environment variables that Grafana uses for all outbound requests.

```bash
# Set in /etc/grafana/grafana.env or as environment variables

HTTP_PROXY=http://proxy.corp.example.com:8080
HTTPS_PROXY=http://proxy.corp.example.com:8080
NO_PROXY=localhost,127.0.0.1,.internal.example.com,10.0.0.0/8
```

For Kubernetes deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:latest
          env:
            - name: HTTP_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: HTTPS_PROXY
              value: "http://proxy.corp.example.com:8080"
            - name: NO_PROXY
              value: "localhost,127.0.0.1,prometheus.monitoring.svc"
```

## 2. Proxy with Authentication

For proxies requiring authentication, include credentials in the proxy URL.

```bash
# Basic auth in URL
HTTP_PROXY=http://username:password@proxy.corp.example.com:8080
HTTPS_PROXY=http://username:password@proxy.corp.example.com:8080

# Or use encoded credentials for special characters
# URL encode: p@ssw0rd! becomes p%40ssw0rd%21
HTTP_PROXY=http://user:p%40ssw0rd%21@proxy.corp.example.com:8080
```

For secure credential management in Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: proxy-credentials
  namespace: monitoring
type: Opaque
stringData:
  HTTP_PROXY: "http://username:password@proxy.corp.example.com:8080"
  HTTPS_PROXY: "http://username:password@proxy.corp.example.com:8080"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          envFrom:
            - secretRef:
                name: proxy-credentials
```

## 3. Configure Server-Side Datasource Access

Grafana datasources support server-side access through the `access: proxy` setting. This means requests are sent by the Grafana server, so HTTP forward proxy behavior still comes from the Grafana process environment or from an intermediary proxy service.

Navigate to Connections > Data sources > Add new data source.

For the Prometheus datasource with server-side access and custom headers:

```yaml
# Datasource provisioning file
apiVersion: 1
datasources:
  - name: External-Prometheus
    type: prometheus
    access: proxy
    url: https://prometheus.external-service.com
    jsonData:
      httpMethod: POST
      manageAlerts: true
      timeInterval: 15s
      # Custom headers if needed
      httpHeaderName1: 'X-Forwarded-For'
    secureJsonData:
      httpHeaderValue1: 'internal-grafana'
```

## 4. Using SOCKS5 Proxy

For SOCKS5 datasource connections, configure Grafana's secure SOCKS5 datasource proxy in `grafana.ini`.

```ini
[secure_socks_datasource_proxy]
enabled = true
root_ca_cert = /etc/grafana/certs/proxy-ca.crt
client_key = /etc/grafana/certs/grafana-client.key
client_cert = /etc/grafana/certs/grafana-client.crt
server_name = proxy.corp.example.com
proxy_address = proxy.corp.example.com:1080
```

Then enable the SOCKS5 proxy for each datasource that should use it.

```yaml
apiVersion: 1
datasources:
  - name: External-Prometheus
    type: prometheus
    access: proxy
    url: https://prometheus.external-service.com
    jsonData:
      enableSecureSocksProxy: true
```

## 5. Configure Proxy in grafana.ini

Set proxy defaults in the Grafana configuration file.

`/etc/grafana/grafana.ini`

```ini
[dataproxy]
# Timeout for data proxy requests
timeout = 60
# Dial timeout
dialTimeout = 30
# Keep-alive period
keep_alive_seconds = 300
# Max idle connections
max_idle_connections = 100
# Max connections per host
max_conns_per_host = 0
# Idle connection timeout
idle_conn_timeout_seconds = 90
# TLS handshake timeout
tls_handshake_timeout_seconds = 10
# Expect: 100-continue timeout
expect_continue_timeout_seconds = 1
# Send user header
send_user_header = false
# Response limit in bytes (0 = unlimited)
response_limit = 0
# Row limit for dataframe responses
row_limit = 1000000
```

## 6. Internal Datasource Access (No Proxy)

Configure NO_PROXY to bypass the proxy for internal services.

```bash
# Comprehensive NO_PROXY configuration
NO_PROXY=localhost,127.0.0.1,.internal.company.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.svc.cluster.local,prometheus.monitoring.svc.cluster.local
```

In Kubernetes, internal service access should bypass the proxy:

```yaml
env:
  - name: NO_PROXY
    value: >-
      localhost,
      127.0.0.1,
      .monitoring.svc.cluster.local,
      .default.svc.cluster.local,
      prometheus,
      loki,
      tempo,
      .svc,
      .cluster.local,
      10.0.0.0/8
```

## 7. TLS/SSL with Proxy

Handle TLS certificates when proxying HTTPS requests.

```yaml
# Datasource provisioning file
apiVersion: 1
datasources:
  - name: External-Prometheus
    type: prometheus
    access: proxy
    url: https://prometheus.external-service.com
    jsonData:
      tlsAuthWithCACert: true
      # Skip TLS verification only for testing.
      tlsSkipVerify: false
    secureJsonData:
      tlsCACert: $GRAFANA_TLS_CA_CERT
```

Store CA certificates in Kubernetes secrets and expose them as environment variables when provisioning datasources:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-datasource-tls
  namespace: monitoring
type: Opaque
stringData:
  GRAFANA_TLS_CA_CERT: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          envFrom:
            - secretRef:
                name: grafana-datasource-tls
```

## 8. Nginx Reverse Proxy for Datasources

For complex routing, use Nginx as an intermediary proxy.

`nginx.conf`

```nginx
upstream external_prometheus {
    server prometheus.external-provider.com:443;
}

server {
    listen 9090;
    server_name prometheus-proxy;

    location / {
        # Forward to external Prometheus from the Nginx host
        proxy_pass https://external_prometheus;
        proxy_http_version 1.1;
        proxy_set_header Host prometheus.external-provider.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;

        # Add authentication if required
        proxy_set_header Authorization "Bearer <prometheus-token>";
    }
}
```

Grafana datasource pointing to Nginx proxy:

```yaml
apiVersion: 1
datasources:
  - name: External-Prometheus-via-Proxy
    type: prometheus
    access: proxy
    url: http://nginx-proxy:9090
    isDefault: false
```

## 9. Debug Proxy Connections

Enable debug logging to troubleshoot proxy issues.

```ini
# grafana.ini
[log]
level = debug
filters = dataproxy:debug

[dataproxy]
logging = true
```

Check logs for proxy-related messages:

```bash
# Docker
docker logs grafana 2>&1 | grep -i proxy

# Kubernetes
kubectl logs deployment/grafana -n monitoring | grep -i proxy

# Systemd
journalctl -u grafana-server | grep -i proxy
```

## 10. Helm Chart Configuration

Configure proxy settings in Grafana Helm values.

`values.yaml`

```yaml
envFromSecrets:
  - name: grafana-proxy-credentials

env:
  NO_PROXY: "localhost,127.0.0.1,.monitoring.svc.cluster.local,prometheus,loki"

grafana.ini:
  dataproxy:
    timeout: 60
    logging: true
  log:
    level: info

# Mount corporate CA certificate
extraSecretMounts:
  - name: corporate-ca
    secretName: corporate-ca-cert
    defaultMode: 0440
    mountPath: /etc/grafana/certs
    readOnly: true
```

## 11. Testing Proxy Configuration

Verify proxy connectivity from the Grafana container.

```bash
# Test from within Grafana container
kubectl exec -it deployment/grafana -n monitoring -- /bin/sh

# Check environment variables
env | grep -i proxy

# Test connectivity through proxy
wget --spider --timeout=10 https://external-service.com/api/health

# Test with curl if available
curl -v --proxy $HTTP_PROXY https://external-service.com/api/health
```

## 12. Common Proxy Issues and Solutions

### Connection Refused

```bash
# Verify proxy is reachable
nc -zv proxy.corp.example.com 8080

# Check firewall rules allow outbound connections
iptables -L -n | grep 8080
```

### Certificate Errors

```bash
# Test TLS through proxy
openssl s_client -connect external-service.com:443 -proxy proxy.corp.example.com:8080

# Verify CA certificate is mounted correctly
kubectl exec deployment/grafana -- cat /etc/grafana/certs/corporate-ca.crt
```

### Authentication Failures

```bash
# Test proxy auth manually
curl -v --proxy-user "username:password" --proxy http://proxy.corp.example.com:8080 https://external-service.com
```

---

Proper proxy configuration enables Grafana to securely access external datasources from restricted networks. Whether using environment variables, datasource-specific settings, or intermediary proxies, the key is matching your configuration to your network's security requirements while maintaining reliable connectivity.
