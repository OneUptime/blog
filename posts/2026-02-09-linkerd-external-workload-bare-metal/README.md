# How to Configure Linkerd External Workload Support for Bare Metal Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Service Mesh, Bare Metal, External Workloads, Kubernetes

Description: Learn how to integrate bare metal services and virtual machines into your Linkerd service mesh using external workload support for unified mTLS, observability.

---

Not every workload runs in Kubernetes. Legacy applications on bare metal servers, database clusters on VMs, and third-party services need to communicate securely with your mesh. Linkerd's mesh expansion support brings these systems into your service mesh without requiring containerization.

This guide shows you how to configure Linkerd to secure and monitor traffic between Kubernetes services and external bare metal workloads while maintaining the same mTLS guarantees and observability you expect from mesh-native services.

## Understanding External Workload Architecture

Linkerd's mesh expansion feature extends the mesh data plane beyond Kubernetes. Instead of running the Linkerd proxy as a sidecar in a pod, you run it as a standalone process on your bare metal server or VM. Linkerd discovers the workload through an `ExternalWorkload` resource, while the external proxy gets its workload identity from SPIFFE/SPIRE.

The architecture creates a unified trust domain spanning both Kubernetes and external infrastructure, enabling seamless service-to-service communication with automatic mTLS encryption.

## Prerequisites and Environment Setup

Install Linkerd 2.15 or later. The edge installer is shown here because the current Linkerd open source quickstart uses edge releases:

```bash
# Install Linkerd CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install-edge | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# Install Linkerd CRDs and control plane
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verify installation
linkerd check
```

Configure firewall rules on your bare metal servers to allow communication with the Kubernetes cluster. The external proxy must be able to reach Linkerd's destination and policy services, and Kubernetes workloads must be able to reach the external workload IP:

```bash
# On your bare metal server
# Allow application traffic from the Kubernetes network
sudo ufw allow from 10.0.0.0/8 to any port 5432 proto tcp

# Allow Prometheus in the Kubernetes network to scrape the proxy admin endpoint
sudo ufw allow from 10.0.0.0/8 to any port 4191 proto tcp
```

## Installing the Linkerd Proxy on Bare Metal

Download and install the Linkerd proxy binary on your external server:

```bash
# On your bare metal server (Ubuntu/Debian)
LINKERD_VERSION=edge-26.5.5
mkdir -p /opt/linkerd-proxy
cd /opt/linkerd-proxy

id=$(docker create cr.l5d.io/linkerd/proxy:${LINKERD_VERSION})
docker cp "$id":/usr/lib/linkerd/linkerd2-proxy ./linkerd-proxy
docker rm -v "$id"

chmod +x linkerd-proxy
sudo mv linkerd-proxy /usr/local/bin/linkerd-proxy
```

Configure SPIRE for the external workload identity. The SPIRE server must be rooted in the same trust bundle as Linkerd so the external workload's SPIFFE certificate is trusted by the mesh:

```bash
# On your bare metal server
wget https://github.com/spiffe/SPIRE/releases/download/v1.8.2/SPIRE-1.8.2-linux-amd64-musl.tar.gz
tar zvxf SPIRE-1.8.2-linux-amd64-musl.tar.gz
sudo mkdir -p /opt/SPIRE
sudo cp -r SPIRE-1.8.2/. /opt/SPIRE/

# Register the workload identity after starting SPIRE server and agent
sudo /opt/SPIRE/bin/spire-server entry create \
  -parentID spiffe://root.linkerd.cluster.local/agent \
  -spiffeID spiffe://root.linkerd.cluster.local/legacy-database \
  -selector unix:uid:$(id -u postgres)
```

## Configuring the External Workload Registration

Create a Kubernetes Service that selects the external workload:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: external-services
---
apiVersion: v1
kind: Service
metadata:
  name: legacy-database
  namespace: external-services
spec:
  type: ClusterIP
  selector:
    app: legacy-database
  ports:
  - name: postgres
    port: 5432
    protocol: TCP
```

Register the workload with Linkerd:

```yaml
apiVersion: workload.linkerd.io/v1beta1
kind: ExternalWorkload
metadata:
  name: legacy-database-01
  namespace: external-services
  labels:
    app: legacy-database
    workload_name: legacy-database-01
spec:
  meshTLS:
    identity: "spiffe://root.linkerd.cluster.local/legacy-database"
    serverName: "legacy-database.cluster.local"
  workloadIPs:
  - ip: 192.168.1.100
  ports:
  - port: 5432
    name: postgres
  - port: 4191
    name: admin
```

Apply the configuration:

```bash
kubectl apply -f external-workload.yaml
```

## Running the Linkerd Proxy as a Systemd Service

Create a systemd service file for the Linkerd proxy:

```bash
# On your bare metal server
sudo tee /etc/systemd/system/linkerd-proxy.service > /dev/null <<'EOF'
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
Environment="LINKERD2_PROXY_ADMIN_LISTEN_ADDR=0.0.0.0:4191"
Environment="LINKERD2_PROXY_OUTBOUND_LISTEN_ADDR=127.0.0.1:4140"
Environment="LINKERD2_PROXY_INBOUND_LISTEN_ADDR=0.0.0.0:4143"
Environment="LINKERD2_PROXY_IDENTITY_SERVER_ID=spiffe://root.linkerd.cluster.local/legacy-database"
Environment="LINKERD2_PROXY_IDENTITY_SERVER_NAME=legacy-database.cluster.local"
Environment="LINKERD2_PROXY_POLICY_WORKLOAD={\"ns\":\"external-services\",\"external_workload\":\"legacy-database-01\"}"
Environment="LINKERD2_PROXY_DESTINATION_CONTEXT={\"ns\":\"external-services\",\"nodeName\":\"bare-metal-01\",\"external_workload\":\"legacy-database-01\"}"
Environment="LINKERD2_PROXY_DESTINATION_SVC_ADDR=linkerd-dst-headless.linkerd.svc.cluster.local.:8086"
Environment="LINKERD2_PROXY_DESTINATION_SVC_NAME=linkerd-destination.linkerd.serviceaccount.identity.linkerd.cluster.local"
Environment="LINKERD2_PROXY_POLICY_SVC_ADDR=linkerd-policy.linkerd.svc.cluster.local.:8090"
Environment="LINKERD2_PROXY_POLICY_SVC_NAME=linkerd-destination.linkerd.serviceaccount.identity.linkerd.cluster.local"
Environment="LINKERD2_PROXY_IDENTITY_SPIRE_SOCKET=unix:///tmp/spire-agent/public/api.sock"

# Run the proxy
ExecStart=/bin/sh -c 'export LINKERD2_PROXY_IDENTITY_TRUST_ANCHORS="$(cat /opt/SPIRE/certs/ca.crt)" && exec /usr/local/bin/linkerd-proxy'

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

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable linkerd-proxy
sudo systemctl start linkerd-proxy

# Check status
sudo systemctl status linkerd-proxy
```

## Configuring Application Traffic Routing

Configure the machine network so inbound and outbound TCP traffic is steered through the Linkerd proxy. The application should run as a different user from the proxy user:

```bash
# On your bare metal server
PROXY_INBOUND_PORT=4143
PROXY_OUTBOUND_PORT=4140
PROXY_USER_UID=$(id -u linkerd)
INBOUND_PORTS_TO_IGNORE="4190,4191,4567,4568"
OUTBOUND_PORTS_TO_IGNORE="4567,4568"

sudo iptables -t nat -N PROXY_INIT_REDIRECT
sudo iptables -t nat -A PROXY_INIT_REDIRECT -p tcp --match multiport --dports "$INBOUND_PORTS_TO_IGNORE" -j RETURN
sudo iptables -t nat -A PROXY_INIT_REDIRECT -p tcp -j REDIRECT --to-port "$PROXY_INBOUND_PORT"
sudo iptables -t nat -A PREROUTING -j PROXY_INIT_REDIRECT

sudo iptables -t nat -N PROXY_INIT_OUTPUT
sudo iptables -t nat -A PROXY_INIT_OUTPUT -m owner --uid-owner "$PROXY_USER_UID" -j RETURN
sudo iptables -t nat -A PROXY_INIT_OUTPUT -o lo -j RETURN
sudo iptables -t nat -A PROXY_INIT_OUTPUT -p tcp --match multiport --dports "$OUTBOUND_PORTS_TO_IGNORE" -j RETURN
sudo iptables -t nat -A PROXY_INIT_OUTPUT -p tcp -j REDIRECT --to-port "$PROXY_OUTBOUND_PORT"
sudo iptables -t nat -A OUTPUT -j PROXY_INIT_OUTPUT

# Make rules persistent on Debian/Ubuntu
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

Applications do not need `HTTP_PROXY` or `HTTPS_PROXY` settings for this setup. Linkerd's proxy expects transparent TCP redirection through iptables, not explicit HTTP proxy traffic.

## Verifying mTLS Connectivity

Test connectivity from a meshed Kubernetes pod to your external workload:

```bash
# Deploy a test pod
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: test-client
  namespace: external-services
  annotations:
    linkerd.io/inject: enabled
spec:
  restartPolicy: Never
  containers:
  - name: client
    image: busybox:1.36
    command: ["sleep", "3600"]
EOF

# Test the TCP connection
kubectl exec -n external-services test-client -- nc -vz legacy-database.external-services.svc.cluster.local 5432
```

Verify mTLS on the bare metal server:

```bash
# Check proxy metrics for TLS-secured connections
curl -s http://127.0.0.1:4191/metrics | grep 'tls="true"'

# View proxy logs
sudo journalctl -u linkerd-proxy -f
```

## Monitoring External Workloads

Query metrics from the external workload proxy. Keep the admin port limited to a private network that your Prometheus server can reach:

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
  selector:
    app: legacy-database
  ports:
  - name: admin
    port: 4191
    targetPort: 4191
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
sum(rate(request_total{namespace="external-services"}[5m]))

# Success rate
sum(rate(response_total{namespace="external-services",classification="success"}[5m])) /
sum(rate(response_total{namespace="external-services"}[5m]))

# Latency percentiles
histogram_quantile(0.99,
  sum(rate(response_latency_ms_bucket{namespace="external-services"}[5m])) by (le)
)
```

## Handling Multiple External Workloads

Deploy a workload group for database replicas:

```yaml
apiVersion: workload.linkerd.io/v1beta1
kind: ExternalWorkload
metadata:
  name: postgres-replica-01
  namespace: external-services
  labels:
    app: postgres-cluster
spec:
  meshTLS:
    identity: "spiffe://root.linkerd.cluster.local/postgres-replica-01"
    serverName: "postgres-replica-01.cluster.local"
  workloadIPs:
  - ip: 192.168.1.101
  ports:
  - port: 5432
    name: postgres
---
apiVersion: workload.linkerd.io/v1beta1
kind: ExternalWorkload
metadata:
  name: postgres-replica-02
  namespace: external-services
  labels:
    app: postgres-cluster
spec:
  meshTLS:
    identity: "spiffe://root.linkerd.cluster.local/postgres-replica-02"
    serverName: "postgres-replica-02.cluster.local"
  workloadIPs:
  - ip: 192.168.1.102
  ports:
  - port: 5432
    name: postgres
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-cluster
  namespace: external-services
spec:
  type: ClusterIP
  selector:
    app: postgres-cluster
  ports:
  - name: postgres
    port: 5432
```

## Certificate Rotation and Renewal

SPIRE issues and rotates the external workload SVIDs for the Linkerd proxy. Instead of copying Linkerd's in-cluster identity issuer secret to the bare metal server, monitor SPIRE and the proxy certificate expiration:

```bash
# Check SPIRE health
sudo /opt/SPIRE/bin/spire-server healthcheck
sudo /opt/SPIRE/bin/spire-agent healthcheck

# Check the Linkerd proxy's current identity certificate expiration metric
curl -s http://127.0.0.1:4191/metrics | grep identity_cert_expiration_timestamp_seconds
```

## Troubleshooting Common Issues

Check proxy connectivity to control plane:

```bash
# Test DNS resolution from the external machine
nslookup linkerd-dst-headless.linkerd.svc.cluster.local
nslookup linkerd-policy.linkerd.svc.cluster.local

# Test network connectivity
nc -vz linkerd-dst-headless.linkerd.svc.cluster.local 8086
nc -vz linkerd-policy.linkerd.svc.cluster.local 8090

# View proxy logs
sudo journalctl -u linkerd-proxy -f
```

Debug certificate issues:

```bash
# Verify SPIRE can issue an SVID for the workload
sudo -u postgres /opt/SPIRE/bin/spire-agent api fetch x509 \
  -socketPath /tmp/spire-agent/public/api.sock

# Check Linkerd proxy identity metrics
curl -s http://127.0.0.1:4191/metrics | grep identity_
```

External workload support transforms Linkerd into a true hybrid service mesh that secures communication across your entire infrastructure, whether services run in containers or on traditional servers.
