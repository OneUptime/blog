# How to Configure Linkerd External Workload Support for Bare Metal Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Service Mesh, Bare Metal, External Workloads, Kubernetes

Description: Learn how to integrate bare metal services and virtual machines into your Linkerd service mesh using external workload support for unified mTLS, observability, and traffic management across hybrid infrastructures.

---

Not every workload runs in Kubernetes. Legacy applications on bare metal servers, database clusters on VMs, and third-party services need to communicate securely with your mesh. Linkerd's external workload support brings these systems into your service mesh without requiring containerization.

This guide shows you how to configure Linkerd to secure and monitor traffic between Kubernetes services and external bare metal workloads while maintaining the same mTLS guarantees and observability you expect from mesh-native services.

## Understanding External Workload Architecture

Linkerd's external workload feature extends the mesh data plane beyond Kubernetes. Instead of running the Linkerd proxy as a sidecar in a pod, you run it as a standalone process on your bare metal server or VM. This proxy registers with the Linkerd control plane and receives the same identity certificates and policy configurations as in-cluster workloads.

The architecture creates a unified trust domain spanning both Kubernetes and external infrastructure, enabling seamless service-to-service communication with automatic mTLS encryption.

## Prerequisites and Environment Setup

Install Linkerd with external workload support enabled:

```bash
# Install Linkerd CLI
curl -sL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# Install Linkerd control plane with external workload support
linkerd install --set enableExternalWorkloads=true | kubectl apply -f -

# Verify installation
linkerd check
```

Configure firewall rules on your bare metal servers to allow communication with the Kubernetes cluster:

```bash
# On your bare metal server
# Allow Linkerd control plane communication (port 8086)
sudo ufw allow from 10.0.0.0/8 to any port 8086 proto tcp

# Allow proxy admin port (4191)
sudo ufw allow from 127.0.0.1 to any port 4191 proto tcp

# Allow your application port (example: 8080)
sudo ufw allow 8080/tcp
```

## Installing the Linkerd Proxy on Bare Metal

Download and install the Linkerd proxy binary on your external server:

```bash
# On your bare metal server (Ubuntu/Debian)
LINKERD_VERSION=stable-2.14.0
curl -sLO https://github.com/linkerd/linkerd2/releases/download/${LINKERD_VERSION}/linkerd2-proxy-${LINKERD_VERSION}-linux-amd64

chmod +x linkerd2-proxy-${LINKERD_VERSION}-linux-amd64
sudo mv linkerd2-proxy-${LINKERD_VERSION}-linux-amd64 /usr/local/bin/linkerd2-proxy
```

Generate identity certificates for the external workload:

```bash
# From your Kubernetes cluster with kubectl access
linkerd identity create-workload \
  --name legacy-database \
  --namespace external-services \
  --output-dir /tmp/linkerd-certs

# Copy certificates to your bare metal server
scp -r /tmp/linkerd-certs user@bare-metal-server:/etc/linkerd/certs/
```

## Configuring the External Workload Registration

Create a Kubernetes Service and ExternalWorkload resource:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-database
  namespace: external-services
  labels:
    app: legacy-database
spec:
  ports:
  - name: postgres
    port: 5432
    protocol: TCP
  clusterIP: None  # Headless service
---
apiVersion: v1
kind: Endpoints
metadata:
  name: legacy-database
  namespace: external-services
subsets:
- addresses:
  - ip: 192.168.1.100  # Your bare metal server IP
  ports:
  - name: postgres
    port: 5432
    protocol: TCP
```

Register the workload with Linkerd:

```yaml
apiVersion: workload.linkerd.io/v1alpha1
kind: ExternalWorkload
metadata:
  name: legacy-database-01
  namespace: external-services
spec:
  meshTLS:
    identity: "legacy-database.external-services.serviceaccount.identity.linkerd.cluster.local"
    serverName: "legacy-database.external-services.svc.cluster.local"
  ports:
  - port: 5432
    name: postgres
  workloadIPs:
  - ip: 192.168.1.100
```

Apply the configuration:

```bash
kubectl apply -f external-workload.yaml
```

## Running the Linkerd Proxy as a Systemd Service

Create a systemd service file for the Linkerd proxy:

```bash
# On your bare metal server
sudo tee /etc/systemd/system/linkerd-proxy.service > /dev/null <<EOF
[Unit]
Description=Linkerd Proxy for External Workload
After=network.target

[Service]
Type=simple
User=linkerd
Group=linkerd
WorkingDirectory=/var/lib/linkerd

# Environment configuration
Environment="LINKERD2_PROXY_LOG=info"
Environment="LINKERD2_PROXY_CONTROL_LISTEN_ADDR=0.0.0.0:4190"
Environment="LINKERD2_PROXY_ADMIN_LISTEN_ADDR=127.0.0.1:4191"
Environment="LINKERD2_PROXY_OUTBOUND_LISTEN_ADDR=127.0.0.1:4140"
Environment="LINKERD2_PROXY_INBOUND_LISTEN_ADDR=0.0.0.0:4143"
Environment="LINKERD2_PROXY_DESTINATION_SVC_ADDR=linkerd-dst.linkerd.svc.cluster.local:8086"
Environment="LINKERD2_PROXY_IDENTITY_DIR=/etc/linkerd/certs"
Environment="LINKERD2_PROXY_IDENTITY_TRUST_ANCHORS=/etc/linkerd/certs/ca.crt"
Environment="LINKERD2_PROXY_IDENTITY_TOKEN_FILE=/etc/linkerd/certs/token"
Environment="LINKERD2_PROXY_IDENTITY_SVC_ADDR=linkerd-identity.linkerd.svc.cluster.local:8080"
Environment="LINKERD2_PROXY_DESTINATION_PROFILE_SUFFIXES=svc.cluster.local."

# Run the proxy
ExecStart=/usr/local/bin/linkerd2-proxy

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Create the linkerd user and start the service:

```bash
# Create service user
sudo useradd -r -s /bin/false linkerd

# Set up directories and permissions
sudo mkdir -p /var/lib/linkerd
sudo chown -R linkerd:linkerd /var/lib/linkerd
sudo chown -R linkerd:linkerd /etc/linkerd

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable linkerd-proxy
sudo systemctl start linkerd-proxy

# Check status
sudo systemctl status linkerd-proxy
```

## Configuring Application Traffic Routing

Configure your application on the bare metal server to route traffic through the Linkerd proxy:

```bash
# For outbound traffic, use iptables to redirect
sudo iptables -t nat -A OUTPUT -p tcp --dport 8080 \
  -j REDIRECT --to-port 4140

# Make rules persistent
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

For applications that support proxy configuration, set the environment variables:

```bash
# Add to your application's environment
export HTTP_PROXY=127.0.0.1:4140
export HTTPS_PROXY=127.0.0.1:4140
export NO_PROXY=localhost,127.0.0.1
```

## Verifying mTLS Connectivity

Test connectivity from a Kubernetes pod to your external workload:

```bash
# Deploy a test pod
kubectl run -it --rm test-client \
  --image=curlimages/curl:latest \
  --restart=Never -- sh

# Inside the pod, test connection
curl -v http://legacy-database.external-services:5432

# Check if traffic is encrypted
kubectl exec -n linkerd -it \
  $(kubectl get pod -n linkerd -l linkerd.io/control-plane-component=destination -o jsonpath='{.items[0].metadata.name}') \
  -c destination -- \
  linkerd-destination-cli get legacy-database.external-services.svc.cluster.local:5432
```

Verify mTLS on the bare metal server:

```bash
# Check proxy admin endpoint
curl http://127.0.0.1:4191/metrics | grep tls_connection

# View active connections
curl http://127.0.0.1:4191/proxy-log-level
```

## Monitoring External Workloads

Query metrics from the external workload proxy:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-database-metrics
  namespace: external-services
  labels:
    app: legacy-database
spec:
  type: ClusterIP
  ports:
  - name: admin
    port: 4191
    targetPort: 4191
  selector:
    app: legacy-database
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: external-workload-monitor
  namespace: external-services
spec:
  selector:
    matchLabels:
      app: legacy-database
  endpoints:
  - port: admin
    interval: 30s
    path: /metrics
```

Create Grafana dashboards for external workload metrics:

```promql
# Request rate from external workload
rate(request_total{namespace="external-services"}[5m])

# Success rate
sum(rate(request_total{namespace="external-services",classification="success"}[5m])) /
sum(rate(request_total{namespace="external-services"}[5m]))

# Latency percentiles
histogram_quantile(0.99,
  rate(response_latency_ms_bucket{namespace="external-services"}[5m])
)
```

## Handling Multiple External Workloads

Deploy a workload group for database replicas:

```yaml
apiVersion: workload.linkerd.io/v1alpha1
kind: ExternalWorkload
metadata:
  name: postgres-replica-01
  namespace: external-services
spec:
  meshTLS:
    identity: "postgres-cluster.external-services.serviceaccount.identity.linkerd.cluster.local"
  ports:
  - port: 5432
    name: postgres
  workloadIPs:
  - ip: 192.168.1.101
---
apiVersion: workload.linkerd.io/v1alpha1
kind: ExternalWorkload
metadata:
  name: postgres-replica-02
  namespace: external-services
spec:
  meshTLS:
    identity: "postgres-cluster.external-services.serviceaccount.identity.linkerd.cluster.local"
  ports:
  - port: 5432
    name: postgres
  workloadIPs:
  - ip: 192.168.1.102
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-cluster
  namespace: external-services
spec:
  ports:
  - name: postgres
    port: 5432
  clusterIP: None
---
apiVersion: v1
kind: Endpoints
metadata:
  name: postgres-cluster
  namespace: external-services
subsets:
- addresses:
  - ip: 192.168.1.101
  - ip: 192.168.1.102
  ports:
  - name: postgres
    port: 5432
```

## Certificate Rotation and Renewal

Automate certificate rotation using a cron job:

```bash
# On your bare metal server
sudo tee /usr/local/bin/rotate-linkerd-certs.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

# Download new certificates from Kubernetes
KUBECONFIG=/etc/linkerd/kubeconfig kubectl get secret \
  -n external-services linkerd-identity-issuer \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/tls.crt

KUBECONFIG=/etc/linkerd/kubeconfig kubectl get secret \
  -n external-services linkerd-identity-issuer \
  -o jsonpath='{.data.tls\.key}' | base64 -d > /tmp/tls.key

# Backup existing certificates
cp /etc/linkerd/certs/tls.crt /etc/linkerd/certs/tls.crt.bak
cp /etc/linkerd/certs/tls.key /etc/linkerd/certs/tls.key.bak

# Install new certificates
mv /tmp/tls.crt /etc/linkerd/certs/tls.crt
mv /tmp/tls.key /etc/linkerd/certs/tls.key

# Restart proxy to pick up new certificates
systemctl restart linkerd-proxy

echo "Certificate rotation completed at $(date)"
EOF

chmod +x /usr/local/bin/rotate-linkerd-certs.sh

# Add cron job (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/rotate-linkerd-certs.sh >> /var/log/linkerd-cert-rotation.log 2>&1" | sudo crontab -
```

## Troubleshooting Common Issues

Check proxy connectivity to control plane:

```bash
# Test DNS resolution
nslookup linkerd-dst.linkerd.svc.cluster.local

# Test network connectivity
telnet linkerd-dst.linkerd.svc.cluster.local 8086

# View proxy logs
sudo journalctl -u linkerd-proxy -f
```

Debug certificate issues:

```bash
# Verify certificate validity
openssl x509 -in /etc/linkerd/certs/tls.crt -text -noout

# Check certificate matches key
openssl x509 -noout -modulus -in /etc/linkerd/certs/tls.crt | openssl md5
openssl rsa -noout -modulus -in /etc/linkerd/certs/tls.key | openssl md5
```

External workload support transforms Linkerd into a true hybrid service mesh that secures communication across your entire infrastructure, whether services run in containers or on traditional servers.
