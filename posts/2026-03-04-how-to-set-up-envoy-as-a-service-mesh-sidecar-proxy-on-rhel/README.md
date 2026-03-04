# How to Set Up Envoy as a Service Mesh Sidecar Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Envoy, Service Mesh, Sidecar Proxy, Microservices

Description: Learn how to install and configure Envoy as a sidecar proxy on RHEL for service-to-service communication in microservices architectures.

---

Envoy is a high-performance proxy designed for service mesh architectures. As a sidecar, it handles traffic routing, load balancing, observability, and security for your application without code changes.

## Installing Envoy

```bash
# Download the official Envoy binary
sudo dnf install -y yum-utils
sudo rpm --import https://getenvoy.io/gpg
sudo yum-config-manager --add-repo https://tetrate.bintray.com/getenvoy-rpm/centos/tetrate-getenvoy-rpm.repo

# Alternatively, download the binary directly
curl -L https://github.com/envoyproxy/envoy/releases/download/v1.28.0/envoy-1.28.0-linux-x86_64 \
  -o /usr/local/bin/envoy
sudo chmod +x /usr/local/bin/envoy

# Verify installation
envoy --version
```

## Basic Sidecar Configuration

Create a configuration file that proxies traffic to a local application:

```yaml
# Save as /etc/envoy/envoy.yaml
static_resources:
  listeners:
    - name: ingress_listener
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
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: local_app
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: local_app
      connect_timeout: 5s
      type: STATIC
      load_assignment:
        cluster_name: local_app
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 3000

admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901
```

## Running as a systemd Service

```bash
# Create a systemd unit file
cat << 'SERVICE' | sudo tee /etc/systemd/system/envoy.service
[Unit]
Description=Envoy Proxy
After=network.target

[Service]
ExecStart=/usr/local/bin/envoy -c /etc/envoy/envoy.yaml
Restart=always
User=envoy

[Install]
WantedBy=multi-user.target
SERVICE

# Create envoy user and directories
sudo useradd -r -s /sbin/nologin envoy
sudo mkdir -p /etc/envoy
sudo systemctl daemon-reload
sudo systemctl enable --now envoy
```

## Verifying the Sidecar

```bash
# Check Envoy admin interface
curl http://localhost:9901/stats | grep "downstream_rq"

# Test proxied traffic
curl http://localhost:8080/
```

Envoy's admin interface at port 9901 provides rich metrics, cluster health status, and configuration dumps. This data integrates well with Prometheus for monitoring your service mesh.
