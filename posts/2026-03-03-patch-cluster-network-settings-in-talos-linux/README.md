# How to Patch Cluster Network Settings in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Networking, Kubernetes, CNI, Configuration

Description: Learn how to patch cluster-level network settings in Talos Linux including pod subnets, service subnets, CNI configuration, and proxy settings.

---

Cluster network settings in Talos Linux control how Kubernetes networking operates at the cluster level. These settings affect pod-to-pod communication, service discovery, DNS, and the container networking interface (CNI). Unlike machine-level network settings that differ per node, cluster network settings are shared across the entire cluster. This guide covers how to patch these settings during initial setup and on running clusters.

## Cluster Network Settings Overview

The cluster network configuration lives under the `cluster.network` section of the machine configuration:

```yaml
cluster:
  network:
    dnsDomain: cluster.local
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
    cni:
      name: flannel
```

These settings determine:
- Which IP ranges are used for pod IPs
- Which IP ranges are used for Kubernetes service ClusterIPs
- The DNS domain for in-cluster service discovery
- Which CNI plugin manages pod networking

## Patching Pod Subnets

Pod subnets define the CIDR blocks from which pod IPs are allocated. The default is usually `10.244.0.0/16`:

```yaml
# pod-subnet-patch.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
```

If you need a larger subnet for clusters with many pods:

```yaml
# large-pod-subnet-patch.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/14  # Supports ~260,000 pod IPs
```

For dual-stack clusters (both IPv4 and IPv6):

```yaml
# dual-stack-pod-subnet-patch.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
      - fd00:10:244::/48
```

Important: Pod subnet changes should be done during initial cluster setup. Changing them on a running cluster requires careful migration because existing pods have IPs from the old range.

## Patching Service Subnets

Service subnets define the CIDR blocks for Kubernetes service ClusterIPs:

```yaml
# service-subnet-patch.yaml
cluster:
  network:
    serviceSubnets:
      - 10.96.0.0/16
```

For dual-stack:

```yaml
# dual-stack-service-subnet-patch.yaml
cluster:
  network:
    serviceSubnets:
      - 10.96.0.0/16
      - fd00:10:96::/112
```

Like pod subnets, service subnets are best set at cluster creation time. The Kubernetes API server and CoreDNS service get their IPs from this range, so changing it on a running cluster is disruptive.

## Configuring the CNI Plugin

Talos supports several built-in CNI options and also allows you to bring your own:

### Flannel (Default)

```yaml
# flannel-patch.yaml
cluster:
  network:
    cni:
      name: flannel
```

Flannel is the default and works well for most clusters. It uses VXLAN encapsulation and requires no additional setup.

### Disabling Built-In CNI for Custom Installation

If you want to use Cilium, Calico, or another CNI:

```yaml
# custom-cni-patch.yaml
cluster:
  network:
    cni:
      name: none
```

With `name: none`, Talos does not install any CNI. You are responsible for installing one after the cluster is bootstrapped. Nodes will be in `NotReady` state until a CNI is installed.

### Installing Cilium via Patch

A common pattern is to disable the built-in CNI and install Cilium through inline manifests:

```yaml
# cilium-patch.yaml
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true  # Cilium replaces kube-proxy
  inlineManifests:
    - name: cilium-install
      contents: |
        ---
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: cilium-install
          namespace: kube-system
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: cilium-install
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: cluster-admin
        subjects:
          - kind: ServiceAccount
            name: cilium-install
            namespace: kube-system
        ---
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: cilium-install
          namespace: kube-system
        spec:
          backoffLimit: 10
          template:
            metadata:
              labels:
                app: cilium-install
            spec:
              restartPolicy: OnFailure
              tolerations:
                - operator: Exists
              serviceAccountName: cilium-install
              containers:
                - name: cilium-install
                  image: quay.io/cilium/cilium-cli:latest
                  args:
                    - install
                    - --set
                    - ipam.mode=kubernetes
```

## Patching the Kubernetes Proxy

The kube-proxy configuration is under `cluster.proxy`:

### Changing Proxy Mode

```yaml
# proxy-ipvs-patch.yaml
cluster:
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-strict-arp: "true"  # Required for MetalLB
```

### Disabling Kube-Proxy

When using a CNI that replaces kube-proxy (like Cilium or Calico with eBPF):

```yaml
# disable-proxy-patch.yaml
cluster:
  proxy:
    disabled: true
```

## Patching the DNS Domain

The cluster DNS domain defaults to `cluster.local`:

```yaml
# dns-domain-patch.yaml
cluster:
  network:
    dnsDomain: k8s.internal
```

Changing the DNS domain affects how services are discovered within the cluster. For example, a service named `my-service` in the `default` namespace would be reachable at `my-service.default.svc.k8s.internal` instead of `my-service.default.svc.cluster.local`.

This should only be changed during initial cluster setup. Changing it on a running cluster breaks existing DNS-based service discovery.

## Patching CoreDNS Configuration

CoreDNS is configured through the cluster configuration:

```yaml
# coredns-patch.yaml
cluster:
  coreDNS:
    disabled: false
    image: registry.k8s.io/coredns/coredns:v1.11.1
```

To customize CoreDNS further, you can patch the ConfigMap after the cluster is running:

```bash
kubectl -n kube-system edit configmap coredns
```

## Applying Cluster Network Patches

During initial setup:

```bash
# Apply cluster network patches when generating configs
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @cluster-network-patch.yaml
```

On a running cluster, cluster network settings must be applied to all control plane nodes:

```bash
# Apply to all control plane nodes
for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
    talosctl apply-config --nodes "$node" --patch @cluster-network-patch.yaml
done
```

Some changes (like proxy mode) also need to be reflected on worker nodes because the kubelet and kube-proxy run there too.

## Multi-Cluster Network Planning

When running multiple clusters that need to communicate, plan your subnets to avoid overlap:

```yaml
# Cluster 1 - Production
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/16

# Cluster 2 - Staging
cluster:
  network:
    podSubnets:
      - 10.245.0.0/16
    serviceSubnets:
      - 10.97.0.0/16

# Cluster 3 - Development
cluster:
  network:
    podSubnets:
      - 10.246.0.0/16
    serviceSubnets:
      - 10.98.0.0/16
```

Non-overlapping subnets are essential for cross-cluster networking, whether through VPN tunnels, service mesh, or federation.

## Common Network Configurations by Use Case

### Standard Web Application Cluster

```yaml
# standard-web-cluster.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/16
    cni:
      name: flannel
  proxy:
    mode: iptables
```

### High-Performance Cluster with Cilium

```yaml
# high-performance-cluster.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/16
    cni:
      name: none
  proxy:
    disabled: true
```

### Network Policy-Focused Cluster with Calico

```yaml
# network-policy-cluster.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/16
    cni:
      name: none  # Install Calico separately
  proxy:
    mode: ipvs
    extraArgs:
      ipvs-strict-arp: "true"
```

### Large-Scale Cluster

```yaml
# large-cluster.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/14  # Larger range for more pods
    serviceSubnets:
      - 10.96.0.0/14   # Larger range for more services
    cni:
      name: none  # Use Cilium for scale
  proxy:
    disabled: true
```

## Verifying Cluster Network Settings

After applying network patches, verify the settings:

```bash
# Check the cluster configuration
talosctl get machineconfig --nodes 10.0.1.10 -o yaml | yq '.cluster.network'

# Verify pod subnet allocation is working
kubectl get pods -A -o wide | head -20

# Check service CIDR
kubectl get svc -A | head -10

# Verify DNS resolution
kubectl run test-dns --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

# Check kube-proxy mode (if not disabled)
kubectl -n kube-system get cm kube-proxy -o yaml | grep mode
```

## Troubleshooting Cluster Network Issues

If pods cannot communicate after changing cluster network settings:

```bash
# Check if CNI is installed and running
kubectl -n kube-system get pods | grep -E "flannel|cilium|calico"

# Check pod IPs are in the expected range
kubectl get pods -A -o wide

# Check node status
kubectl get nodes -o wide

# Verify network routes on nodes
talosctl get routes --nodes 10.0.1.10

# Check CNI logs
kubectl -n kube-system logs -l app=flannel --tail=50
```

## Conclusion

Cluster network settings in Talos Linux define the fundamental networking behavior of your Kubernetes cluster. Pod subnets, service subnets, CNI selection, and proxy configuration all live in the `cluster.network` and `cluster.proxy` sections. Most of these settings should be configured at cluster creation time because changing them on running clusters can be disruptive. When planning your cluster network, think about subnet sizing for your scale, whether you need dual-stack support, and which CNI meets your requirements for performance and network policy enforcement. Apply these settings consistently across all control plane nodes, and verify them after application to make sure everything is working as expected.
