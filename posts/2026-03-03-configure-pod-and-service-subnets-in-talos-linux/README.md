# How to Configure Pod and Service Subnets in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, CIDR, Kubernetes, Subnet

Description: Learn how to configure custom pod and service CIDR subnets in Talos Linux to match your network architecture.

---

When you create a Kubernetes cluster, two internal IP ranges are allocated: one for pods and one for services. These CIDR ranges determine how many pods and services your cluster can support, and they must not overlap with each other or with your existing network infrastructure. Talos Linux uses sensible defaults, but in many real-world environments you need to customize these ranges to fit your network architecture.

This guide explains how to configure pod and service subnets in Talos Linux, how to plan your CIDR allocation, and common pitfalls to avoid.

## Understanding the Two Networks

Kubernetes uses two separate virtual networks. The pod network assigns an IP address to every pod in the cluster. Pods use these IPs to communicate with each other directly. The service network assigns ClusterIP addresses to Kubernetes Services, which act as stable endpoints that load-balance traffic to pod backends.

The default CIDR ranges in Talos Linux are:

```
# Default Talos Linux network configuration
Pod CIDR:     10.244.0.0/16  (65,534 addresses)
Service CIDR: 10.96.0.0/12   (1,048,574 addresses)
```

These defaults work for most clusters, but you need to change them if they overlap with your existing network or if you need different capacity.

## Configuring Subnets During Cluster Creation

The pod and service subnets should be configured when you generate the Talos cluster configuration. While some changes can be made after creation, changing CIDR ranges on a running cluster is disruptive and not recommended.

```bash
# Generate Talos configuration with custom subnets
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch '[{"op": "add", "path": "/cluster/network/podSubnets", "value": ["172.16.0.0/16"]}, {"op": "add", "path": "/cluster/network/serviceSubnets", "value": ["172.17.0.0/16"]}]'
```

Or use a patch file for cleaner configuration:

```yaml
# custom-subnets.yaml
# Configure custom pod and service subnets
cluster:
  network:
    podSubnets:
      - 172.16.0.0/16
    serviceSubnets:
      - 172.17.0.0/16
```

Generate the configuration:

```bash
# Generate config with custom subnets
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @custom-subnets.yaml
```

## Planning Your CIDR Ranges

Proper CIDR planning prevents address conflicts and ensures your cluster can scale to the size you need.

### Pod Network Sizing

Each node gets a slice of the pod CIDR. The default per-node allocation is a /24 (256 addresses). Calculate the maximum number of nodes your pod CIDR supports:

```
# Pod CIDR calculation
# CIDR: 172.16.0.0/16
# Per-node allocation: /24
# Available /24 subnets in a /16: 256

# So a /16 pod CIDR supports up to 256 nodes
# Each node can run up to 254 pods (2 addresses reserved)

# For larger clusters:
# /14 = 1,024 nodes
# /12 = 4,096 nodes
# /8  = 65,536 nodes
```

Configure the per-node pod CIDR size through the controller manager:

```yaml
# node-cidr-size.yaml
# Adjust the per-node pod CIDR allocation
cluster:
  controllerManager:
    extraArgs:
      node-cidr-mask-size: "24"  # Default is 24, use 25 for smaller allocation
  network:
    podSubnets:
      - 172.16.0.0/14  # Supports 1024 nodes with /24 per node
```

### Service Network Sizing

The service CIDR determines how many ClusterIP services you can create:

```
# Service CIDR calculation
# /16 = 65,534 services
# /12 = 1,048,574 services
# /20 = 4,094 services (sufficient for most clusters)
```

Most clusters never come close to 65,000 services, so a /16 or even a /20 is usually plenty.

### Avoiding Conflicts

The pod and service CIDRs must not overlap with:
- Each other
- Your node network (physical/virtual machine IPs)
- Any VPN or VPC CIDR ranges
- Corporate network ranges
- Cloud provider reserved ranges

```
# Example of a conflict-free network design
Node network:     192.168.1.0/24    (Physical nodes)
Pod CIDR:         10.244.0.0/16     (Pod IPs)
Service CIDR:     10.96.0.0/16      (Service ClusterIPs)
VPN network:      10.0.0.0/8        # CONFLICT with pod and service CIDRs!

# Fixed design avoiding 10.0.0.0/8
Node network:     192.168.1.0/24
Pod CIDR:         172.16.0.0/16
Service CIDR:     172.17.0.0/16
VPN network:      10.0.0.0/8
```

## Configuring Dual-Stack Networking

Talos Linux supports dual-stack networking with both IPv4 and IPv6 subnets:

```yaml
# dual-stack-subnets.yaml
# Configure dual-stack pod and service subnets
cluster:
  network:
    podSubnets:
      - 172.16.0.0/16
      - fd00:10:244::/48
    serviceSubnets:
      - 172.17.0.0/16
      - fd00:10:96::/112
```

With dual-stack, every pod and service gets both an IPv4 and IPv6 address. This is useful for environments that are migrating to IPv6 or need to serve traffic on both protocols.

## Configuring the CNI for Custom Subnets

Your CNI plugin must be configured to use the same pod CIDR as the cluster. Here are examples for common CNI plugins:

### Flannel

Talos Linux configures Flannel automatically based on the pod subnet. No additional configuration is needed if using the default Flannel CNI.

### Cilium

```yaml
# cilium-custom-cidr.yaml
# Cilium values matching custom pod subnet
ipam:
  mode: kubernetes
  operator:
    clusterPoolIPv4PodCIDRList:
      - 172.16.0.0/16
    clusterPoolIPv4MaskSize: 24
```

### Calico

```yaml
# calico-custom-cidr.yaml
# Calico installation with custom pod CIDR
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - blockSize: 26
        cidr: 172.16.0.0/16
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
```

## Verifying Subnet Configuration

After creating the cluster, verify the subnets are configured correctly:

```bash
# Check the pod CIDR assigned to each node
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Check the service CIDR
kubectl cluster-info dump | grep -m 1 service-cluster-ip-range

# Verify a pod received an IP from the correct range
kubectl run test --image=busybox --restart=Never -- sleep 3600
kubectl get pod test -o jsonpath='{.status.podIP}'
kubectl delete pod test

# Check the kubernetes service ClusterIP
kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}'
# This should be the first usable IP in your service CIDR
```

## Checking for Address Exhaustion

Monitor your CIDR utilization to catch address exhaustion before it causes problems:

```bash
# Count pods per node vs. available addresses
kubectl get pods --all-namespaces -o wide --no-headers | \
  awk '{print $8}' | sort | uniq -c | sort -rn

# Check if any nodes are running out of pod IPs
kubectl get events --all-namespaces | grep -i "cidr\|ip.*exhaust\|no.*available"
```

Create a monitoring alert for CIDR utilization:

```yaml
# cidr-alert.yaml
# Alert when pod CIDR utilization is high
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cidr-alerts
  namespace: monitoring
spec:
  groups:
    - name: cidr-utilization
      rules:
        - alert: HighPodCIDRUtilization
          expr: |
            sum by (node) (kubelet_running_pods) /
            on(node) group_left()
            (2 ^ (32 - scalar(kube_node_spec_pod_cidr_mask_size))) > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.node }} is using over 80% of its pod CIDR"
```

## Migrating to New Subnets

If you absolutely must change subnets on an existing cluster (which is highly disruptive), the general approach is:

1. Create a new Talos configuration with the desired subnets
2. Drain and remove worker nodes one at a time
3. Re-add them with the new configuration
4. For control plane nodes, the process is more complex and may require recreating the cluster

The recommended approach is to plan your subnets correctly from the start and avoid migration entirely.

```bash
# Before creating the cluster, document your network plan
# Node network:     192.168.1.0/24
# Pod CIDR:         172.16.0.0/16 (supports 256 nodes, 254 pods each)
# Service CIDR:     172.17.0.0/16 (supports 65,534 services)
# DNS:              172.17.0.10 (10th IP in service CIDR)
```

Configuring pod and service subnets in Talos Linux is a foundational decision that affects the entire life of your cluster. Get it right during initial setup by choosing CIDR ranges that do not conflict with your existing infrastructure, provide enough capacity for future growth, and align with your CNI plugin's requirements. The few minutes spent planning your network ranges up front will save hours of troubleshooting and potential cluster rebuilds later.
