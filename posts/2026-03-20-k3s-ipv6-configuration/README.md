# How to Configure K3s for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, IPv6, Networking, DevOps

Description: Learn how to configure K3s for IPv6-only or IPv6 single-stack networking to support modern network infrastructure.

## Introduction

As IPv4 addresses become scarce and IPv6 adoption grows, running Kubernetes with IPv6 is increasingly important. K3s supports IPv6 single-stack mode where pods, services, and nodes communicate exclusively over IPv6. This guide covers configuring K3s for IPv6 operation, including network requirements, installation, and verification.

## Prerequisites

- Linux host with IPv6 network connectivity
- IPv6 subnet available for pod and service CIDR allocation
- Kernel with IPv6 support (all modern Linux kernels)
- No IPv4-only constraints in your environment

## Step 1: Verify IPv6 Support on the Host

```bash
# Check if IPv6 is enabled

cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 = enabled, 1 = disabled

# If disabled, enable it
echo 0 > /proc/sys/net/ipv6/conf/all/disable_ipv6

# Make permanent
cat >> /etc/sysctl.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.default.disable_ipv6 = 0
net.ipv6.conf.lo.disable_ipv6 = 0
EOF
sysctl -p

# Check the host's IPv6 address
ip -6 addr show
# Should show your IPv6 addresses

# Test IPv6 connectivity
ping6 -c 4 2001:4860:4860::8888  # Google's IPv6 DNS
```

## Step 2: Configure IPv6 Forwarding

Kubernetes requires IP forwarding to route pod traffic:

```bash
# Enable IPv6 forwarding
cat >> /etc/sysctl.conf << 'EOF'
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
EOF

sysctl -p

# Verify
cat /proc/sys/net/ipv6/conf/all/forwarding
# Should output: 1
```

If your IPv6 default route is learned from router advertisements (RA), also set `net.ipv6.conf.all.accept_ra=2`; otherwise the node can drop the default route after it expires.

## Step 3: Install K3s with IPv6 Configuration

```bash
# Plan your IPv6 subnets:
# Cluster CIDR (pod IPs): fd42::/56
# Service CIDR: fd43::/112
# Node CIDR size: /64 per node (default)

# Install K3s server with IPv6
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="
    --cluster-cidr=fd42::/56
    --service-cidr=fd43::/112
    --cluster-dns=fd43::10
    --node-ip=<server-ipv6>
    --flannel-ipv6-masq=true
  " \
  sh -
```

Or using a config file:

```yaml
# /etc/rancher/k3s/config.yaml
# IPv6 single-stack configuration
cluster-cidr: "fd42::/56"
service-cidr: "fd43::/112"
cluster-dns: "fd43::10"
node-ip: "<server-ipv6>"

# Flannel IPv6 settings
flannel-ipv6-masq: true

# Optional: specify flannel backend
flannel-backend: vxlan
```

## Step 4: Install K3s Agent with IPv6

```bash
# Agent nodes need the server's IPv6 address
curl -sfL https://get.k3s.io | \
  K3S_URL=https://[<server-ipv6>]:6443 \
  K3S_TOKEN=<node-token> \
  INSTALL_K3S_EXEC="agent --node-ip=<agent-ipv6>" \
  sh -

# Note: IPv6 addresses in URLs must be enclosed in brackets
# Example: https://[2001:db8::1]:6443
```

## Step 5: Verify IPv6 Cluster

```bash
# Check nodes have IPv6 addresses
kubectl get nodes -o wide
# Internal-IP should show IPv6 addresses

# Check pods have IPv6 IPs
kubectl get pods -A -o wide
# Pod IP should be from the fd42::/56 range

# Check services have IPv6 cluster IPs
kubectl get svc -A
# Cluster IP should be from fd43::/112 range

# Verify DNS is using IPv6
kubectl run dns-test --image=busybox --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/dns-test --timeout=120s
kubectl exec dns-test -- nslookup kubernetes.default.svc.cluster.local
# Should resolve to IPv6 address

kubectl delete pod dns-test
```

## Step 6: Test IPv6 Pod Communication

```bash
# Deploy a test application
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: ipv6-server
  labels:
    app: ipv6-server
spec:
  containers:
    - name: server
      image: nginx:latest
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: ipv6-server-svc
spec:
  selector:
    app: ipv6-server
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
EOF

kubectl wait --for=condition=Ready pod/ipv6-server --timeout=120s

# Get the service ClusterIP (should be IPv6)
kubectl get svc ipv6-server-svc

# Test connectivity from another pod
kubectl run test-client --image=curlimages/curl --restart=Never --command \
  -- curl -v http://ipv6-server-svc/
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/test-client --timeout=120s

kubectl logs test-client

# Clean up
kubectl delete pod ipv6-server test-client
kubectl delete svc ipv6-server-svc
```

## Step 7: Configure IPv6-Aware Ingress

If you want the packaged Traefik Service to be explicitly single-stack IPv6:

```yaml
# /var/lib/rancher/k3s/server/manifests/traefik-ipv6.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    service:
      spec:
        ipFamilies:
          - IPv6
        ipFamilyPolicy: SingleStack
```

## Step 8: CoreDNS IPv6 Configuration

Ensure CoreDNS is configured for IPv6:

```bash
# Verify CoreDNS has IPv6 service IP
kubectl get svc kube-dns -n kube-system

# The cluster-dns flag should point to an IPv6 address
# Example: fd43::10 (from service CIDR)

# Verify DNS resolution works over IPv6
kubectl run dns-test --image=busybox --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local fd43::10
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/dns-test --timeout=120s

kubectl logs dns-test
kubectl delete pod dns-test
```

## Step 9: Network Policy with IPv6

```yaml
# ipv6-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal-ipv6
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - ipBlock:
            # Allow from the pod CIDR
            cidr: fd42::/56
  egress:
    - to:
        - ipBlock:
            cidr: fd42::/56
    - ports:
        # Allow DNS over IPv6
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

## Conclusion

K3s supports IPv6 single-stack networking with a clean configuration experience. The key requirements are choosing appropriate IPv6 CIDRs for pods and services, enabling IPv6 forwarding on all nodes, and configuring Flannel for IPv6 masquerading. IPv6-only clusters are well-suited for modern data centers and IoT deployments where IPv6 is the primary or sole network protocol. Always verify end-to-end connectivity after configuration with test pods before deploying production workloads.
