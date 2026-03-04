# How to Install and Configure Envoy Proxy on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Envoy, Proxy, Linux

Description: Learn how to install and Configure Envoy Proxy on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Envoy is a high-performance, open-source edge and service proxy designed for cloud-native applications. Originally built at Lyft, it handles load balancing, observability, and traffic management with extensive configuration options.

## Prerequisites

- RHEL 9
- Root or sudo access
- Basic understanding of HTTP proxying concepts

## Step 1: Install Envoy

Add the Envoy repository and install:

```bash
sudo dnf install -y yum-utils
sudo curl -L https://getenvoy.io/linux/rhel/tetrate-getenvoy.repo -o /etc/yum.repos.d/tetrate-getenvoy.repo
sudo dnf install -y getenvoy-envoy
```

Alternatively, download the binary directly:

```bash
curl -L https://github.com/envoyproxy/envoy/releases/latest/download/envoy-x86_64 -o /usr/local/bin/envoy
chmod +x /usr/local/bin/envoy
```

Verify:

```bash
envoy --version
```

## Step 2: Create a Basic Configuration

```bash
sudo mkdir -p /etc/envoy
sudo vi /etc/envoy/envoy.yaml
```

```yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_cluster
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_cluster
    connect_timeout: 5s
    type: STRICT_DNS
    load_assignment:
      cluster_name: backend_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: 127.0.0.1
                port_value: 3000
```

## Step 3: Create a systemd Service

```bash
sudo vi /etc/systemd/system/envoy.service
```

```ini
[Unit]
Description=Envoy Proxy
After=network.target

[Service]
ExecStart=/usr/local/bin/envoy -c /etc/envoy/envoy.yaml
Restart=on-failure
User=envoy
Group=envoy

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r -s /sbin/nologin envoy
sudo systemctl daemon-reload
sudo systemctl enable --now envoy
```

## Step 4: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Step 5: Test the Proxy

```bash
curl http://localhost:8080/
```

## Step 6: View Admin Interface

Add to envoy.yaml:

```yaml
admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901
```

Access stats at `http://localhost:9901/stats` and cluster info at `http://localhost:9901/clusters`.

## Conclusion

Envoy provides a feature-rich proxy platform on RHEL 9 with advanced load balancing, observability, and traffic management capabilities. Its configuration-driven approach makes it adaptable to a wide range of proxy and service mesh scenarios.
