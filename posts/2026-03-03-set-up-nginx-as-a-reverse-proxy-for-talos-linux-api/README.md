# How to Set Up Nginx as a Reverse Proxy for Talos Linux API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Nginx, Reverse Proxy, Kubernetes, API, Load Balancing

Description: Learn how to configure Nginx as a reverse proxy for the Talos Linux API to improve security, reliability, and load distribution across control plane nodes.

---

When running Talos Linux in production, you need a reliable way to access the Talos API across multiple control plane nodes. Placing Nginx in front of your Talos API endpoints gives you load balancing, TLS termination options, and a single stable endpoint for all API interactions. This guide walks through the complete setup process.

## Why Use a Reverse Proxy for the Talos API

The Talos API runs on port 50000 by default on every control plane node. In a multi-node control plane setup, you want a single endpoint that can route requests to any healthy node. Without a reverse proxy, you would need to target specific node IPs, which creates a single point of failure if that node goes down.

A reverse proxy solves several problems at once. It provides a stable DNS name or virtual IP for your API. It distributes traffic across healthy nodes. It can add an extra layer of access control. And it simplifies certificate management when you have a known endpoint.

## Prerequisites

Before starting, make sure you have the following in place:

- A running Talos Linux cluster with at least one control plane node
- A separate machine or VM to run Nginx (this should not be a Talos node)
- Network connectivity between the Nginx host and all control plane nodes on port 50000
- Nginx installed on the proxy host

## Installing Nginx

On a Debian or Ubuntu host, install Nginx with the stream module. The stream module is critical because the Talos API uses gRPC, which runs over HTTP/2 and requires Layer 4 (TCP) proxying rather than Layer 7 (HTTP) proxying.

```bash
# Install Nginx with stream module support
sudo apt update
sudo apt install -y nginx libnginx-mod-stream
```

On RHEL or CentOS systems:

```bash
# Install Nginx on RHEL-based systems
sudo dnf install -y nginx nginx-mod-stream
```

Verify that the stream module is available:

```bash
# Check that the stream module is loaded
nginx -V 2>&1 | grep -o with-stream
```

You should see `with-stream` in the output.

## Configuring the Stream Proxy

Since the Talos API uses gRPC over TLS, we need to configure Nginx as a TCP stream proxy rather than an HTTP proxy. Create a new configuration file for the Talos API proxy.

```nginx
# /etc/nginx/nginx.conf
# Add this block at the top level (not inside the http block)

stream {
    # Define the upstream group of Talos control plane nodes
    upstream talos_api {
        # Use least_conn for better distribution of long-lived gRPC connections
        least_conn;

        # Replace these with your actual control plane node IPs
        server 10.0.1.10:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:50000 max_fails=3 fail_timeout=30s;
    }

    server {
        # Listen on port 50000 for Talos API traffic
        listen 50000;

        # Proxy to the upstream group
        proxy_pass talos_api;

        # Set timeouts appropriate for gRPC streams
        proxy_timeout 600s;
        proxy_connect_timeout 10s;
    }
}
```

The `least_conn` directive ensures that new connections go to the node with the fewest active connections, which works well for gRPC because connections can be long-lived.

## Adding Health Checks

Nginx open source does not include active health checks for stream upstreams, but the passive health check mechanism works well enough for most setups. The `max_fails` and `fail_timeout` parameters handle this. When a node fails to respond 3 times within 30 seconds, Nginx marks it as unavailable and stops sending traffic to it.

If you need active health checks, you can use a simple script that runs periodically:

```bash
#!/bin/bash
# /usr/local/bin/check-talos-health.sh
# Simple health check script for Talos API nodes

NODES=("10.0.1.10" "10.0.1.11" "10.0.1.12")
TALOS_PORT=50000

for node in "${NODES[@]}"; do
    # Try to connect to the Talos API port
    if ! nc -z -w 5 "$node" "$TALOS_PORT" 2>/dev/null; then
        echo "$(date): Node $node is unreachable on port $TALOS_PORT"
        # You could trigger an alert here
    fi
done
```

## Configuring Certificate SANs

When you generate your Talos configuration, you need to include the Nginx proxy's IP address or DNS name in the certificate Subject Alternative Names (SANs). This allows talosctl to verify the server certificate when connecting through the proxy.

```bash
# Generate Talos configs with the proxy address in the SANs
talosgen config my-cluster https://talos-proxy.example.com:50000 \
    --additional-sans talos-proxy.example.com \
    --additional-sans 10.0.1.100
```

If you already have a running cluster, you can update the certificate SANs by patching the machine configuration:

```yaml
# sans-patch.yaml
machine:
  certSANs:
    - talos-proxy.example.com
    - 10.0.1.100
```

Apply this patch to all control plane nodes:

```bash
# Apply the SAN patch to each control plane node
talosctl apply-config --nodes 10.0.1.10 --patch @sans-patch.yaml
talosctl apply-config --nodes 10.0.1.11 --patch @sans-patch.yaml
talosctl apply-config --nodes 10.0.1.12 --patch @sans-patch.yaml
```

## Configuring talosctl to Use the Proxy

Update your talosctl configuration to point to the Nginx proxy instead of individual nodes:

```bash
# Update the talosctl config to use the proxy endpoint
talosctl config endpoint talos-proxy.example.com
```

You can verify the connection through the proxy:

```bash
# Test the connection through the proxy
talosctl --nodes 10.0.1.10 version
```

## Adding Access Control

You can restrict which IP addresses can connect to the Talos API through the proxy by adding access control rules to the Nginx configuration:

```nginx
stream {
    upstream talos_api {
        least_conn;
        server 10.0.1.10:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:50000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 50000;
        proxy_pass talos_api;
        proxy_timeout 600s;
        proxy_connect_timeout 10s;

        # Only allow connections from the admin network
        allow 192.168.1.0/24;
        allow 10.0.0.0/16;
        deny all;
    }
}
```

## Also Proxying the Kubernetes API

Since you already have Nginx running, you can proxy the Kubernetes API server as well. Add another upstream and server block:

```nginx
stream {
    upstream talos_api {
        least_conn;
        server 10.0.1.10:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:50000 max_fails=3 fail_timeout=30s;
    }

    # Kubernetes API upstream
    upstream kube_api {
        least_conn;
        server 10.0.1.10:6443 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:6443 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:6443 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 50000;
        proxy_pass talos_api;
        proxy_timeout 600s;
        proxy_connect_timeout 10s;
    }

    server {
        listen 6443;
        proxy_pass kube_api;
        proxy_timeout 600s;
        proxy_connect_timeout 10s;
    }
}
```

## Testing and Validating

After configuring everything, test the Nginx configuration and restart the service:

```bash
# Test the Nginx configuration for syntax errors
sudo nginx -t

# Restart Nginx to apply the changes
sudo systemctl restart nginx

# Check that Nginx is listening on the expected ports
sudo ss -tlnp | grep nginx
```

Then verify connectivity through the proxy:

```bash
# Check Talos API connectivity
talosctl version --endpoints talos-proxy.example.com

# Check Kubernetes API connectivity
kubectl --server=https://talos-proxy.example.com:6443 get nodes
```

## Monitoring the Proxy

Add logging to your stream configuration to track connections and troubleshoot issues:

```nginx
stream {
    # Define a log format for stream connections
    log_format stream_log '$remote_addr [$time_local] '
                         '$protocol $status $bytes_sent $bytes_received '
                         '$session_time "$upstream_addr"';

    access_log /var/log/nginx/talos-stream.log stream_log;

    upstream talos_api {
        least_conn;
        server 10.0.1.10:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:50000 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:50000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 50000;
        proxy_pass talos_api;
        proxy_timeout 600s;
        proxy_connect_timeout 10s;
    }
}
```

## Conclusion

Setting up Nginx as a reverse proxy for the Talos Linux API is a straightforward process that provides significant benefits for production clusters. The key points to remember are to use stream (Layer 4) proxying rather than HTTP proxying, include the proxy address in your certificate SANs, and configure appropriate health check parameters. With this setup, you get a stable, reliable endpoint for managing your Talos cluster that can survive individual node failures without disrupting your workflow.
