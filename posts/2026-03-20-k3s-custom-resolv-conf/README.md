# How to Configure K3s with Custom Resolv.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, DNS, resolv.conf, CoreDNS

Description: Learn how to configure K3s to use a custom resolv.conf for pod DNS resolution, including upstream DNS servers and search domains.

## Introduction

DNS resolution in Kubernetes involves multiple layers: pod DNS configuration, CoreDNS cluster DNS, and the upstream DNS servers that CoreDNS forwards to. By default, K3s checks the host's `/etc/resolv.conf` and `/run/systemd/resolve/resolv.conf` to find a viable resolver configuration. In some environments - such as when using systemd-resolved, VPN clients, or corporate DNS servers - you may still want to point K3s at a specific resolv.conf. This guide covers how to configure a custom resolv.conf for K3s.

## How K3s Handles DNS

1. Pods send DNS queries to CoreDNS (cluster DNS IP, typically `10.43.0.10`)
2. CoreDNS resolves cluster-internal names (`.cluster.local`)
3. For external names, CoreDNS forwards to upstream DNS servers
4. By default, K3s uses a viable resolver file from the node (`/etc/resolv.conf` or `/run/systemd/resolve/resolv.conf`), unless you explicitly set `resolv-conf`

## Common DNS Issues

### systemd-resolved Conflict

Many modern Linux distributions use `systemd-resolved`, which sets `/etc/resolv.conf` to point to `127.0.0.53` (a loopback address). That stub address would not work if it were passed directly into pods, which is why K3s checks for a viable resolver file and may use `/run/systemd/resolve/resolv.conf` instead.

```bash
# Check if systemd-resolved is active

systemctl status systemd-resolved

# Check current resolv.conf
cat /etc/resolv.conf
# If it shows: nameserver 127.0.0.53
# K3s should normally prefer /run/systemd/resolve/resolv.conf when that file is present
```

## Solution 1: Use the Real DNS Address

Provide K3s with a resolv.conf that points to a real DNS server:

```bash
# Create a custom resolv.conf for K3s
sudo tee /etc/rancher/k3s/resolv.conf > /dev/null <<EOF
# K3s custom DNS configuration
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
search cluster.local svc.cluster.local
options ndots:5
EOF

# Configure K3s to use this file
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/resolv-conf.yaml > /dev/null <<EOF
resolv-conf: /etc/rancher/k3s/resolv.conf
EOF

# Restart the K3s service on this node
sudo systemctl restart k3s || sudo systemctl restart k3s-agent
```

## Solution 2: Use systemd-resolved's Real resolv.conf

systemd-resolved also maintains a non-stub resolver file that lists the real upstream DNS servers:

```bash
# Get the real DNS IP used by systemd-resolved
resolvectl status | grep "DNS Servers"

# Or inspect the non-stub resolver file
cat /run/systemd/resolve/resolv.conf

# Configure K3s to use it
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/resolv-conf.yaml > /dev/null <<EOF
resolv-conf: /run/systemd/resolve/resolv.conf
EOF

# Restart the K3s service on this node
sudo systemctl restart k3s || sudo systemctl restart k3s-agent
```

## Solution 3: Configure Corporate DNS

For environments with a corporate DNS server:

```bash
sudo tee /etc/rancher/k3s/resolv.conf > /dev/null <<EOF
# Corporate DNS configuration
# Primary corporate DNS
nameserver 10.0.0.53
# Secondary corporate DNS
nameserver 10.0.0.54
search corp.example.com example.com
options ndots:5
EOF

sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/resolv-conf.yaml > /dev/null <<EOF
resolv-conf: /etc/rancher/k3s/resolv.conf
EOF

# Restart the K3s service on this node
sudo systemctl restart k3s || sudo systemctl restart k3s-agent
```

## Configuring CoreDNS for Split-Horizon DNS

For environments with internal and external DNS zones, K3s supports split-horizon DNS through the `coredns-custom` ConfigMap. The default CoreDNS configuration continues handling all other queries.

```bash
# Create a K3s CoreDNS override ConfigMap
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  corp.override: |
    forward corp.example.com 10.0.0.53 {
      policy sequential
    }
EOF
```

```yaml
# CoreDNS custom override
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  corp.override: |
    forward corp.example.com 10.0.0.53 {
      policy sequential
    }
```

```bash
# Apply CoreDNS changes
kubectl -n kube-system rollout restart deployment/coredns

# Verify
kubectl -n kube-system rollout status deployment/coredns
```

## Testing DNS Resolution

```bash
# Create a test pod to verify DNS resolution
kubectl run dns-test \
    --image=busybox \
    --restart=Never \
    --rm \
    -it \
    -- sh

# Inside the pod:
# Test cluster DNS
nslookup kubernetes.default.svc.cluster.local
# Expected: Server: 10.43.0.10

# Test external DNS
nslookup google.com
# Expected: resolved to Google IP

# Test corporate DNS
nslookup myapp.corp.example.com
# Expected: resolved if using split-horizon config

# Check the pod's resolv.conf
cat /etc/resolv.conf
```

## Configuring DNS for Specific Pods

You can also configure DNS on a per-pod basis:

```yaml
# custom-dns-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: "None"  # Don't use cluster DNS
  dnsConfig:
    nameservers:
      - 10.0.0.53       # Corporate DNS
      - 8.8.8.8         # Public DNS fallback
    searches:
      - corp.example.com
      - default.svc.cluster.local
      - svc.cluster.local
      - cluster.local
    options:
      - name: ndots
        value: "5"
  containers:
    - name: app
      image: nginx:alpine
```

```yaml
# Use cluster DNS but add custom nameservers
apiVersion: v1
kind: Pod
metadata:
  name: hybrid-dns-pod
spec:
  dnsPolicy: "ClusterFirst"
  dnsConfig:
    nameservers:
      - 10.0.0.53       # Additional nameserver
    searches:
      - corp.example.com
  containers:
    - name: app
      image: nginx:alpine
```

## Troubleshooting DNS Issues

```bash
# Check CoreDNS pods are running
kubectl -n kube-system get pods -l k8s-app=kube-dns

# View CoreDNS logs
kubectl -n kube-system logs -l k8s-app=kube-dns

# Check the kubelet resolv-conf argument
ps -ef | grep [k]ubelet | grep resolv-conf

# Test from within the cluster
kubectl run nslookup \
    --image=busybox \
    --restart=Never \
    --rm \
    -it \
    -- nslookup kubernetes.default

# Check CoreDNS configuration
kubectl -n kube-system get configmap coredns -o yaml
```

## Conclusion

DNS configuration in K3s affects how pods resolve both cluster-internal and external names. A common issue is systemd-resolved on the host providing a loopback DNS address (`127.0.0.53`) in `/etc/resolv.conf`, although K3s will usually switch to `/run/systemd/resolve/resolv.conf` when it is available. If you need to force a specific resolver configuration, provide K3s with a custom resolv.conf via the `resolv-conf` setting. For split-horizon DNS, corporate DNS integration, or custom search domains, configure CoreDNS through the `coredns-custom` ConfigMap. Always test DNS resolution from within a pod after making changes to confirm they are working correctly.
