# How to Replace kube-proxy with Cilium on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, kube-proxy, eBPF, Kubernetes, Networking

Description: Step-by-step guide to replacing kube-proxy with Cilium on Talos Linux for better performance and observability.

---

kube-proxy has been the default service routing component in Kubernetes since the beginning. It works, but it has limitations - especially at scale. It relies on iptables or IPVS rules that grow linearly with the number of services, and it cannot provide deep network observability without additional tools. Cilium offers an alternative that uses eBPF programs in the Linux kernel to handle service routing, load balancing, and network policy enforcement, all with better performance and richer visibility.

On Talos Linux, replacing kube-proxy with Cilium involves disabling kube-proxy in the Talos configuration and installing Cilium with its kube-proxy replacement feature enabled. This guide walks through the complete process.

## Why Replace kube-proxy

There are several practical reasons to make this switch. First, performance. Cilium's eBPF-based datapath handles service routing in constant time regardless of how many services exist, while kube-proxy's iptables mode degrades as services are added. Second, observability. Cilium's Hubble component provides detailed network flow visibility without needing packet captures. Third, consistency. With Cilium handling both networking and service routing, you have one component to configure and monitor instead of two.

The trade-off is complexity during setup. Once running, Cilium as a kube-proxy replacement is stable and well-tested in production environments.

## Prerequisites

Before starting, make sure you have:
- A Talos Linux cluster (new or existing)
- kubectl configured to access the cluster
- Helm 3 installed
- The Cilium CLI installed (optional but recommended)

## Step 1: Disable kube-proxy in Talos

The first step is telling Talos not to deploy kube-proxy. This is done through the machine configuration:

```yaml
# disable-kube-proxy.yaml
# Disable kube-proxy so Cilium can replace it
cluster:
  proxy:
    disabled: true
  network:
    cni:
      name: none  # We will install Cilium as the CNI too
```

For a new cluster, include this in your configuration generation:

```bash
# Generate Talos config without kube-proxy
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @disable-kube-proxy.yaml
```

For an existing cluster, apply the patch:

```bash
# Apply to all control plane nodes
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @disable-kube-proxy.yaml

# Apply to all worker nodes
talosctl apply-config --nodes 192.168.1.20,192.168.1.21,192.168.1.22 \
  --patch @disable-kube-proxy.yaml
```

If you are migrating from an existing kube-proxy setup, delete the kube-proxy DaemonSet after Cilium is running:

```bash
# Remove the existing kube-proxy DaemonSet
kubectl delete daemonset kube-proxy -n kube-system

# Clean up the kube-proxy ConfigMap
kubectl delete configmap kube-proxy -n kube-system
```

## Step 2: Install Cilium with kube-proxy Replacement

Install Cilium using Helm with the kube-proxy replacement feature enabled:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update
```

Create a values file with all the necessary settings:

```yaml
# cilium-kpr-values.yaml
# Cilium with full kube-proxy replacement on Talos Linux

# Enable kube-proxy replacement
kubeProxyReplacement: true

# The API server address and port
# Use the control plane endpoint or load balancer address
k8sServiceHost: 192.168.1.10
k8sServicePort: 6443

# IPAM configuration
ipam:
  mode: kubernetes

# Enable DSR (Direct Server Return) for better performance
loadBalancer:
  mode: dsr
  # Use the fastest algorithm
  algorithm: maglev

# Talos-specific cgroup settings
cgroup:
  autoMount:
    enabled: false
  hostRoot: /sys/fs/cgroup

# Security context for Talos Linux
securityContext:
  capabilities:
    ciliumAgent:
      - CHOWN
      - KILL
      - NET_ADMIN
      - NET_RAW
      - IPC_LOCK
      - SYS_ADMIN
      - SYS_RESOURCE
      - DAC_OVERRIDE
      - FOWNER
      - SETGID
      - SETUID
    cleanCiliumState:
      - NET_ADMIN
      - SYS_ADMIN
      - SYS_RESOURCE

# Enable Hubble for observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true

# Enable bandwidth management
bandwidthManager:
  enabled: true

# Install on all nodes including control plane
tolerations:
  - operator: Exists
    effect: NoSchedule

# Enable health checking
healthChecking: true
healthPort: 9879
```

Install Cilium:

```bash
# Install Cilium with kube-proxy replacement
helm install cilium cilium/cilium \
  --namespace kube-system \
  -f cilium-kpr-values.yaml
```

## Step 3: Verify kube-proxy Replacement

Wait for Cilium to be fully deployed, then verify the replacement is working:

```bash
# Wait for all Cilium pods to be ready
kubectl wait --for=condition=Ready pods -l k8s-app=cilium -n kube-system --timeout=300s

# Check Cilium status
cilium status

# Verify kube-proxy replacement is active
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium status | grep "KubeProxyReplacement"
```

You should see output like:

```
KubeProxyReplacement:    True
```

Test service routing:

```bash
# Create a test deployment and service
kubectl create deployment nginx --image=nginx:1.25
kubectl expose deployment nginx --port=80 --type=ClusterIP

# Wait for the pod to be ready
kubectl wait --for=condition=Ready pods -l app=nginx --timeout=60s

# Test the service from within the cluster
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never \
  -- curl -s http://nginx.default.svc.cluster.local

# Clean up
kubectl delete deployment nginx
kubectl delete service nginx
```

## Step 4: Verify NodePort and LoadBalancer Services

kube-proxy replacement must handle all service types. Test each one:

```bash
# Test NodePort service
kubectl create deployment web --image=nginx:1.25
kubectl expose deployment web --port=80 --type=NodePort
NODE_PORT=$(kubectl get svc web -o jsonpath='{.spec.ports[0].nodePort}')

echo "NodePort service available at any node IP on port $NODE_PORT"
curl http://192.168.1.20:$NODE_PORT

# Clean up
kubectl delete deployment web
kubectl delete service web
```

## Understanding DSR and Maglev

The values file above enables two important features:

### Direct Server Return (DSR)

With DSR, the reply from a backend pod goes directly to the client instead of routing back through the node that received the request. This cuts the network path in half for return traffic:

```
# Without DSR (default SNAT mode):
Client -> Node A -> Pod on Node B -> Node A -> Client

# With DSR:
Client -> Node A -> Pod on Node B -> Client (directly)
```

DSR requires that your network supports it. If pods cannot send packets directly to external clients, fall back to SNAT mode:

```yaml
loadBalancer:
  mode: snat  # Fall back if DSR doesn't work in your network
```

### Maglev Hashing

Maglev is a consistent hashing algorithm that provides better load distribution than the default random algorithm. It also maintains connection persistence across backend changes, which means existing connections are less likely to be disrupted when pods are added or removed.

## Monitoring Cilium's Service Routing

With Hubble enabled, you get detailed network flow information:

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Use the Hubble CLI to observe flows
hubble observe --type flow --protocol TCP

# Watch traffic to a specific service
hubble observe --to-service default/my-service

# Check for dropped packets
hubble observe --verdict DROPPED
```

## Handling the Migration

If you are migrating from an active kube-proxy setup to Cilium, follow this sequence to minimize downtime:

```bash
# 1. Install Cilium with kubeProxyReplacement first
helm install cilium cilium/cilium -n kube-system -f cilium-kpr-values.yaml

# 2. Wait for Cilium to be ready on all nodes
kubectl rollout status daemonset/cilium -n kube-system --timeout=300s

# 3. Verify Cilium has programmed all services
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium service list | wc -l

# 4. Compare with the number of Kubernetes services
kubectl get services --all-namespaces | wc -l

# 5. If the numbers match, disable kube-proxy in Talos
talosctl apply-config --nodes 192.168.1.10,192.168.1.20 --patch @disable-kube-proxy.yaml

# 6. Delete the kube-proxy DaemonSet
kubectl delete ds kube-proxy -n kube-system

# 7. Clean up iptables rules left by kube-proxy
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium cleanup-kube-proxy-rules
```

## Troubleshooting

If services stop working after the migration:

```bash
# Check Cilium agent logs for errors
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -i error

# Verify BPF maps are loaded
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium bpf lb list

# Check that Cilium can reach the API server
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium status --brief

# Verify endpoint health
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium endpoint list
```

Replacing kube-proxy with Cilium on Talos Linux is a significant upgrade for clusters that need better performance, richer observability, or more advanced load balancing capabilities. The process requires careful planning, especially for existing clusters, but the result is a more efficient and observable networking stack. The key is disabling kube-proxy in Talos configuration, installing Cilium with the right settings for Talos's cgroup and security context requirements, and verifying that all service types work correctly before considering the migration complete.
