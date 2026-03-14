# How to Set Up Cilium CNI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, CNI, EBPF, Networking, Kubernetes

Description: Complete guide to installing and configuring Cilium as the CNI plugin on Talos Linux using eBPF for high-performance Kubernetes networking.

---

Cilium is an eBPF-based CNI plugin that has become one of the most popular networking solutions for Kubernetes clusters. It brings features that traditional CNI plugins simply cannot offer because of its deep integration with the Linux kernel through eBPF. If you are running Talos Linux and want advanced observability, Layer 7 network policies, transparent encryption, and high performance, Cilium is the CNI to choose.

This guide covers installing and configuring Cilium on Talos Linux from scratch.

## Why Cilium on Talos Linux?

Cilium stands out from other CNI plugins for several reasons:

- **eBPF-powered**: Instead of iptables rules, Cilium uses eBPF programs loaded directly into the kernel for packet processing. This is faster and more efficient.
- **kube-proxy replacement**: Cilium can completely replace kube-proxy, eliminating iptables-based service routing.
- **Hubble observability**: Built-in network observability lets you see all traffic flows between pods, services, and external endpoints.
- **Layer 7 policies**: Write network policies based on HTTP methods, paths, headers, gRPC services, and Kafka topics.
- **Transparent encryption**: WireGuard or IPsec encryption between nodes with zero application changes.

Talos Linux and Cilium are a natural fit because both are designed for modern, security-focused Kubernetes deployments.

## Prerequisites

- Talos Linux v1.5 or later
- Kubernetes 1.25 or later
- Helm v3 installed
- kubectl configured

## Step 1: Prepare the Talos Configuration

You need to disable both the default CNI (Flannel) and kube-proxy in your Talos machine configuration since Cilium will replace both:

```yaml
# Control plane machine config for Cilium
machine:
  # Allow scheduling on control plane if needed
  # (remove if you have dedicated worker nodes)
  features:
    kubePrism:
      enabled: true
      port: 7445
cluster:
  network:
    cni:
      name: none    # Disable default Flannel
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  proxy:
    disabled: true    # Disable kube-proxy since Cilium replaces it
```

Apply to all nodes:

```bash
# Apply to control plane
talosctl -n <cp-ip> apply-config --file controlplane.yaml

# Apply to workers
talosctl -n <worker-ip> apply-config --file worker.yaml
```

After applying, nodes will be NotReady until Cilium is installed.

## Step 2: Install Cilium

### Using Helm (Recommended)

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with kube-proxy replacement
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<api-server-ip-or-vip> \
  --set k8sServicePort=6443 \
  --set ipam.mode=kubernetes \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup
```

The `k8sServiceHost` should point to your Kubernetes API server. If you are using a Talos VIP, use that address. If you have a single control plane node, use its IP.

### Using Cilium CLI

Alternatively, you can use the Cilium CLI:

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin/

# Install Cilium
cilium install \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<api-server-ip-or-vip> \
  --set k8sServicePort=6443
```

## Step 3: Verify the Installation

```bash
# Check Cilium pods
kubectl get pods -n kube-system -l k8s-app=cilium

# Run Cilium status check
cilium status

# Run connectivity tests
cilium connectivity test

# Check that all nodes are Ready
kubectl get nodes
```

The connectivity test creates test pods and validates that pod-to-pod, pod-to-service, and pod-to-external connectivity all work correctly.

## Step 4: Enable Hubble Observability

If you included Hubble in your installation, set it up for use:

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/

# Port-forward to Hubble relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Observe traffic flows
hubble observe --follow

# Filter by namespace
hubble observe --namespace default --follow

# Filter by verdict (show dropped traffic)
hubble observe --verdict DROPPED --follow
```

Access the Hubble UI:

```bash
# Port-forward to Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80 &

# Open http://localhost:12000 in your browser
```

## Step 5: Configure Network Policies

Cilium supports both standard Kubernetes NetworkPolicy and its own CiliumNetworkPolicy CRDs:

### Standard Kubernetes NetworkPolicy

```yaml
# Default deny in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Cilium Layer 7 Network Policy

```yaml
# Layer 7 HTTP policy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-rules
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v1/public/.*"
              - method: POST
                path: "/api/v1/data"
                headers:
                  - 'Content-Type: application/json'
```

### Cilium Cluster-Wide Policy

```yaml
# Cluster-wide DNS policy
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-dns
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*"
```

## Step 6: Enable Transparent Encryption

Cilium can encrypt all pod-to-pod traffic using WireGuard:

```bash
# Enable WireGuard encryption
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
```

Verify encryption is active:

```bash
# Check encryption status
cilium status | grep Encryption

# Verify WireGuard interfaces on nodes
kubectl exec -n kube-system ds/cilium -- cilium encrypt status
```

## Tuning Cilium for Performance

### Enable Native Routing

If your network can route pod IPs directly (no encapsulation needed):

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR=10.244.0.0/16
```

### Enable Bandwidth Manager

Cilium's bandwidth manager provides better traffic shaping:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set bandwidthManager.enabled=true
```

### Enable BBR Congestion Control

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set bandwidthManager.enabled=true \
  --set bandwidthManager.bbr=true
```

## Troubleshooting Cilium on Talos Linux

### Cilium Pods Not Starting

```bash
# Check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=100

# Common issue: cgroup mount
# Talos uses cgroup v2, make sure these Helm values are set:
# --set cgroup.autoMount.enabled=false
# --set cgroup.hostRoot=/sys/fs/cgroup
```

### Nodes Not Ready After Installation

```bash
# Check if Cilium is healthy on the affected node
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=<node-name> -o name) -- cilium status

# Check BPF map status
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -1) -- cilium bpf tunnel list
```

### Service Connectivity Issues (kube-proxy replacement)

```bash
# Verify kube-proxy replacement is working
kubectl exec -n kube-system ds/cilium -- cilium service list

# Check BPF service map
kubectl exec -n kube-system ds/cilium -- cilium bpf lb list
```

## Conclusion

Cilium on Talos Linux gives you a cutting-edge networking stack that leverages eBPF for performance, security, and observability. The installation is straightforward when you remember to disable both the default CNI and kube-proxy in your Talos configuration. Once running, Cilium provides everything from basic pod networking to advanced features like Layer 7 policies, transparent encryption, and deep traffic observability through Hubble. For Talos Linux deployments that need more than basic networking, Cilium is the top choice.
