# How to Configure K3s Dual-Stack Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, IPv4, IPv6, Dual-Stack, Networking, DevOps

Description: Learn how to configure K3s with dual-stack networking to support both IPv4 and IPv6 simultaneously for pods and services.

## Introduction

IPv6 dual-stack allows a Kubernetes cluster to support both IPv4 and IPv6 addresses simultaneously. Pods and services can have both an IPv4 and an IPv6 address, enabling gradual migration to IPv6 while maintaining IPv4 compatibility. K3s has experimental dual-stack support as of v1.21.0+k3s1, with stable support available as of v1.23.7+k3s1. This guide covers configuring K3s for dual-stack operation.

## Prerequisites

- Hosts with both IPv4 and IPv6 network connectivity
- Kernel with IPv6 support
- K3s version that supports dual-stack (stable in v1.23.7+k3s1+, experimental in v1.21.0+k3s1+)
- Non-overlapping IPv4 and IPv6 CIDR ranges for pods and services

## Step 1: Prepare the Host Network

Ensure both IPv4 and IPv6 are configured and working:

```bash
# Verify IPv4 connectivity

ping -c 4 8.8.8.8

# Verify IPv6 connectivity
ping6 -c 4 2001:4860:4860::8888

# Check both address families are on the primary interface
ip addr show eth0
# Should show both inet (IPv4) and inet6 (IPv6) addresses

# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl -w net.ipv4.ip_forward=1

# Make permanent
cat >> /etc/sysctl.d/99-k3s-networking.conf << 'EOF'
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
EOF
sysctl --system
```

## Step 2: Plan Your CIDR Ranges

Choose non-overlapping CIDR blocks:

```text
# IPv4 CIDRs
Pod CIDR (IPv4):     10.42.0.0/16
Service CIDR (IPv4): 10.43.0.0/16

# IPv6 CIDRs
Pod CIDR (IPv6):     fd42::/56
Service CIDR (IPv6): fd43::/112

# Cluster DNS (will get both IPv4 and IPv6)
Cluster DNS (IPv4):  10.43.0.10
Cluster DNS (IPv6):  fd43::10
```

## Step 3: Install K3s with Dual-Stack Configuration

```bash
# Install K3s server with dual-stack
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="
    --cluster-cidr=10.42.0.0/16,fd42::/56
    --service-cidr=10.43.0.0/16,fd43::/112
    --cluster-dns=10.43.0.10,fd43::10
    --flannel-ipv6-masq=true
  " \
  sh -
```

Using a config file (recommended):

```yaml
# /etc/rancher/k3s/config.yaml
# Dual-stack networking configuration

# IPv4 and IPv6 CIDRs
cluster-cidr:
  - 10.42.0.0/16
  - fd42::/56
service-cidr:
  - 10.43.0.0/16
  - fd43::/112

# Both IPv4 and IPv6 DNS service IPs
cluster-dns:
  - 10.43.0.10
  - fd43::10

# Enable IPv6 masquerading on Flannel
flannel-ipv6-masq: true
```

Install K3s:

```bash
curl -sfL https://get.k3s.io | sh -
```

## Step 4: Join Agent Nodes

Agent nodes join the same way, but ensure their config also supports dual-stack:

```bash
# Install agent
curl -sfL https://get.k3s.io | \
  K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> \
  sh -

# Agent nodes automatically inherit dual-stack configuration from the server
```

## Step 5: Verify Dual-Stack Configuration

```bash
# Check nodes have both IPv4 and IPv6 internal IPs
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .status.addresses[*]}{.type}: {.address}{"\n"}{end}{"\n"}{end}'

# Check pods have dual-stack IPs
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}: {range .status.podIPs[*]}{.ip} {end}{"\n"}{end}'

# Verify the CoreDNS service has both ClusterIPs
kubectl get svc -n kube-system kube-dns -o yaml | grep -A 12 '^spec:'
# Should show:
# clusterIP: 10.43.0.10
# clusterIPs:
# - 10.43.0.10    (IPv4)
# - fd43::10      (IPv6)
# ipFamilyPolicy: RequireDualStack
```

## Step 6: Create Dual-Stack Services

Services can be configured for different IP family policies:

```yaml
# dual-stack-service.yaml
---
# Service with both IPv4 and IPv6 (PreferDualStack)
apiVersion: v1
kind: Service
metadata:
  name: my-app-dual
spec:
  selector:
    app: my-app
  # Request dual-stack
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  ports:
    - port: 80
      targetPort: 8080
---
# Service with only IPv6
apiVersion: v1
kind: Service
metadata:
  name: my-app-ipv6-only
spec:
  selector:
    app: my-app
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  ports:
    - port: 80
      targetPort: 8080
---
# Service with only IPv4 (default behavior)
apiVersion: v1
kind: Service
metadata:
  name: my-app-ipv4-only
spec:
  selector:
    app: my-app
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv4
  ports:
    - port: 80
      targetPort: 8080
```

## Step 7: Test Dual-Stack Connectivity

```bash
# Deploy test application
kubectl create deployment test-app --image=nginx:latest
kubectl expose deployment test-app --port=80 \
  --type=ClusterIP \
  --overrides='{"spec":{"ipFamilyPolicy":"RequireDualStack"}}'

# Get service IPs
kubectl get svc test-app

# Test IPv4 connectivity
kubectl run test --attach --rm -i --image=busybox --restart=Never -- \
  wget -qO- http://10.43.x.x/  # IPv4 cluster IP

# Test IPv6 connectivity
kubectl run test6 --attach --rm -i --image=busybox --restart=Never -- \
  wget -qO- http://[fd43::x]/  # IPv6 cluster IP

# Clean up
kubectl delete deployment test-app
kubectl delete svc test-app
```

## Step 8: Configure Ingress for Dual-Stack

```yaml
# /var/lib/rancher/k3s/server/manifests/traefik-dualstack.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    service:
      # Enable dual-stack for Traefik's LoadBalancer service
      ipFamilyPolicy: RequireDualStack
      ipFamilies:
        - IPv4
        - IPv6
```

## Step 9: Verify CoreDNS for Dual-Stack

K3s templates the `kube-dns` service from the `cluster-dns` values you set, so no additional CoreDNS dual-stack manifest is required.

```bash
kubectl get svc -n kube-system kube-dns -o yaml | grep -A 12 '^spec:'
```

## Conclusion

K3s dual-stack networking enables running both IPv4 and IPv6 in your cluster, providing flexibility for gradual IPv6 migration and compatibility with mixed-protocol environments. The key configuration points are providing both IPv4 and IPv6 CIDRs for pods and services, and, when using ULA or other non-publicly routed IPv6 ranges, enabling IPv6 masquerading in Flannel. Once configured, services can be created with various IP family policies to control whether they respond to IPv4, IPv6, or both.
