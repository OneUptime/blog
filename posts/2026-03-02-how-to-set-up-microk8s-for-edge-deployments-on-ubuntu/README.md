# How to Set Up MicroK8s for Edge Deployments on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MicroK8s, Kubernetes, Edge Computing, IoT

Description: A complete guide to deploying MicroK8s for edge computing on Ubuntu, covering single-node and multi-node cluster setup, add-ons for edge workloads, and resource optimization.

---

MicroK8s is a lightweight, self-contained Kubernetes distribution from Canonical that installs as a snap package. It runs the full Kubernetes API on hardware as modest as a Raspberry Pi, making it well-suited for edge deployments where you need the Kubernetes operational model without a full control plane infrastructure.

This guide covers installing MicroK8s on Ubuntu, configuring it for edge constraints, joining nodes into a cluster, and deploying workloads with appropriate resource management.

## Why MicroK8s for Edge

- **Single binary install** - no kubeadm bootstrap process
- **Automatic updates** - snap handles MicroK8s upgrades
- **Optional components** - enable only what you need (DNS, ingress, storage)
- **Low resource footprint** - runs on 2 CPU cores and 4 GB RAM
- **Works offline** - all container images can be pre-loaded

For comparison: a standard kubeadm cluster needs ~6 GB RAM just for control plane components. A single-node MicroK8s cluster runs in under 1 GB idle.

## Prerequisites

- Ubuntu 20.04 or 22.04 (or Ubuntu Core for embedded)
- 2+ GB RAM (4 GB recommended)
- 20 GB disk space
- Snapd installed (default on Ubuntu)

## Installing MicroK8s

```bash
# Install the latest stable channel
sudo snap install microk8s --classic --channel=1.29/stable

# Add your user to the microk8s group (avoid sudo for kubectl)
sudo usermod -aG microk8s $USER

# Apply the group change
newgrp microk8s

# Wait for MicroK8s to be ready
microk8s status --wait-ready
```

Check the status:

```bash
microk8s status
# Output:
# microk8s is running
# high-availability: no
# addons:
#   enabled:
#     ha-cluster           # (core) Configure high availability on the current node
#     helm                 # (core) Helm - the Kubernetes package manager
#     helm3                # (core) Helm 3 - Kubernetes package manager
```

## Setting Up kubectl

MicroK8s includes its own kubectl:

```bash
# Use the bundled kubectl
microk8s kubectl get nodes

# Create an alias for convenience
echo "alias kubectl='microk8s kubectl'" >> ~/.bashrc
source ~/.bashrc

# Or export the kubeconfig for use with standard kubectl
mkdir -p ~/.kube
microk8s config > ~/.kube/config
chmod 600 ~/.kube/config
kubectl get nodes
```

## Enabling Essential Add-ons

MicroK8s add-ons extend the cluster with optional components:

```bash
# DNS - required for service discovery (almost always needed)
microk8s enable dns

# Local storage - provides PersistentVolumes backed by host directories
microk8s enable hostpath-storage

# Ingress controller (Nginx-based)
microk8s enable ingress

# Dashboard (optional - useful for monitoring edge nodes)
microk8s enable dashboard

# Metrics server (required for kubectl top and HPA)
microk8s enable metrics-server
```

Check add-on status:

```bash
microk8s status
```

## Firewall Configuration

If UFW is enabled, configure it for Kubernetes networking:

```bash
# Allow pod-to-pod communication (Kubernetes CNI)
sudo ufw allow in on cni0 && sudo ufw allow fwd on cni0
sudo ufw allow in on vxlan.calico && sudo ufw allow fwd on vxlan.calico

# Allow Kubernetes API server (if connecting from external kubectl)
sudo ufw allow 16443/tcp

# Allow NodePort range
sudo ufw allow 30000:32767/tcp
sudo ufw allow 30000:32767/udp
```

## Resource Limits for Edge Hardware

On resource-constrained edge devices, set cluster-wide resource defaults:

```yaml
# limit-range.yaml - default resource limits for all pods
apiVersion: v1
kind: LimitRange
metadata:
  name: edge-defaults
  namespace: default
spec:
  limits:
    - type: Container
      default:
        # Default limits if not specified in pod spec
        memory: 256Mi
        cpu: 200m
      defaultRequest:
        # Default requests if not specified
        memory: 64Mi
        cpu: 50m
      max:
        # Maximum any container can request
        memory: 1Gi
        cpu: 1000m
```

```bash
kubectl apply -f limit-range.yaml
```

Also configure resource quotas per namespace:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: edge-quota
  namespace: production
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 2Gi
    limits.cpu: "4"
    limits.memory: 4Gi
    count/pods: "20"
```

## Reducing MicroK8s Resource Usage

For minimal hardware:

```bash
# Disable unused add-ons
microk8s disable ha-cluster  # If running single-node

# Reduce kube-apiserver memory
sudo nano /var/snap/microk8s/current/args/kube-apiserver
# Add: --max-requests-inflight=150 --max-mutating-requests-inflight=50

# Reduce etcd snapshot frequency
sudo nano /var/snap/microk8s/current/args/k8s-dqlite
# etcd equivalent: --snapshot-count=5000

# Restart after config changes
sudo snap restart microk8s
```

## Setting Up a Multi-Node Edge Cluster

MicroK8s makes multi-node clustering straightforward:

**On the primary node:**

```bash
# Generate a join token
microk8s add-node
# Output:
# From the node you wish to join to this cluster, run the following:
# microk8s join 192.168.1.10:25000/abc123.../token --worker
```

**On the worker node (after installing MicroK8s):**

```bash
# Join the cluster using the token from the primary
microk8s join 192.168.1.10:25000/abc123token --worker
```

Verify cluster membership:

```bash
kubectl get nodes
# NAME          STATUS   ROLES    AGE   VERSION
# edge-node-1   Ready    <none>   10m   v1.29.0
# edge-node-2   Ready    <none>   5m    v1.29.0
```

## High Availability Mode

For clusters where you can afford 3 nodes, enable HA:

```bash
# On the primary node, after adding two more nodes:
microk8s enable ha-cluster

# HA uses dqlite (distributed SQLite) for etcd-equivalent functionality
# No external etcd required
```

## Deploying Edge Workloads

A typical edge workload - a Modbus gateway collecting sensor data:

```yaml
# edge-sensor-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sensor-gateway
  labels:
    app: sensor-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sensor-gateway
  template:
    metadata:
      labels:
        app: sensor-gateway
    spec:
      # Pin to a specific edge node
      nodeName: edge-node-1

      containers:
        - name: gateway
          image: yourregistry/sensor-gateway:latest
          resources:
            requests:
              memory: 64Mi
              cpu: 50m
            limits:
              memory: 256Mi
              cpu: 200m
          env:
            - name: MODBUS_HOST
              value: "192.168.2.100"
            - name: MQTT_BROKER
              value: "mqtt.internal"

          # Health checks are important for auto-recovery on edge
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
```

## Working Offline

Edge devices often have limited or intermittent internet connectivity. Pre-load required images:

```bash
# On a machine with internet access, pull and save images
docker pull nginx:1.25
docker save nginx:1.25 | gzip > nginx-1.25.tar.gz

# Copy to edge device and import
scp nginx-1.25.tar.gz edge-device:/tmp/

# On edge device, import into MicroK8s containerd
microk8s ctr images import /tmp/nginx-1.25.tar.gz

# Verify
microk8s ctr images list | grep nginx
```

## Setting Up a Local Registry

For air-gapped edge sites, run a local registry inside MicroK8s:

```bash
# Enable the built-in registry (runs on port 32000)
microk8s enable registry

# Push images to the local registry
docker tag myapp:latest localhost:32000/myapp:latest
docker push localhost:32000/myapp:latest

# Use in pod specs
# image: localhost:32000/myapp:latest
```

## Automatic Recovery

Configure MicroK8s to start automatically and recover from power loss:

```bash
# MicroK8s snap auto-starts on boot
sudo snap set microk8s start-timeout=60s

# Enable automatic snap refresh
sudo snap refresh microk8s --channel=1.29/stable

# Configure snap to not auto-refresh during business hours
sudo snap set system refresh.schedule="00:00-04:00"
```

## Monitoring Edge Nodes

Enable the metrics server and use kubectl top:

```bash
microk8s enable metrics-server

# View node resource usage
kubectl top nodes

# View pod resource usage
kubectl top pods --all-namespaces
```

For more detailed monitoring, enable Prometheus:

```bash
microk8s enable prometheus

# Access Grafana at http://node-ip:31000 (NodePort)
# Default credentials: admin/prom-operator
```

## Troubleshooting

**MicroK8s not ready after install:**
```bash
# Check service status
microk8s inspect

# View component logs
sudo journalctl -u snap.microk8s.daemon-kubelite -f

# Common fix: reset and restart
sudo snap restart microk8s
```

**Pods stuck in Pending:**
```bash
# Check events
kubectl describe pod pod-name

# Most common cause on edge: insufficient resources
kubectl top nodes
kubectl describe node edge-node-1 | grep -A 10 "Allocatable"
```

**Node not joining cluster:**
```bash
# Verify connectivity
nc -zv 192.168.1.10 25000

# Check join token is still valid (they expire)
microk8s add-node  # generates a fresh token

# Firewall
sudo ufw allow 25000/tcp
sudo ufw allow 19001/tcp  # dqlite port for HA
```

MicroK8s brings the full Kubernetes API to edge hardware without the operational overhead of managing etcd, kubeadm bootstrapping, or separate control plane nodes. For deployments that need Kubernetes-style workload management at the edge - whether that is factory floors, retail locations, or remote sensor nodes - it provides a practical foundation.
