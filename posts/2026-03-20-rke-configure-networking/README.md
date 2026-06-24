# How to Configure RKE Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, Networking, CNI, Canal, Flannel, Calico

Description: A comprehensive guide to configuring CNI network plugins in RKE, including Canal, Flannel, Calico, and Weave.

## Introduction

Networking is a foundational aspect of any Kubernetes cluster. RKE1 reached end of life on July 31, 2025, so use this guide for maintaining existing RKE1 clusters and prefer RKE2 for new deployments. RKE supports multiple CNI (Container Network Interface) plugins and provides flexible options for pod and service network CIDRs, MTU settings, and network policies. Choosing the right CNI and configuring it correctly ensures reliable pod-to-pod communication and policy enforcement.

## Supported CNI Plugins

| Plugin | Network Policy | IPAM | Performance |
|--------|---------------|------|-------------|
| Canal | Yes (Calico) | Flannel | Good |
| Flannel | No | Flannel | Good |
| Calico | Yes | Calico | Excellent |
| Weave | Yes (deprecated in Kubernetes v1.27+, removed in v1.30+) | Weave | Good |
| None | N/A | N/A | Custom |

## Basic Network Configuration

```yaml
# cluster.yml

network:
  plugin: canal    # Default: canal
```

## Configuring Canal (Default)

Canal combines Flannel for routing and Calico for network policy enforcement:

```yaml
# cluster.yml
network:
  plugin: canal
  options:
    # Backend type for flannel: vxlan (default), host-gw, or ipsec
    canal_flannel_backend_type: "vxlan"
    # Canal iface - override to target a specific interface
    canal_iface: "eth0"

# Configure pod and service CIDRs
services:
  kube-controller:
    cluster_cidr: 10.42.0.0/16
    service_cluster_ip_range: 10.43.0.0/16
  kube-api:
    service_cluster_ip_range: 10.43.0.0/16
```

## Configuring Flannel

Flannel is simpler and has lower overhead but does not support network policies:

```yaml
# cluster.yml
network:
  plugin: flannel
  options:
    # Backend type: vxlan (default), host-gw, or udp
    flannel_backend_type: "vxlan"
    # Override the network interface
    flannel_iface: "eth0"
```

### Using host-gw Backend (Higher Performance)

`host-gw` requires all nodes to be on the same L2 network but offers better performance:

```yaml
network:
  plugin: flannel
  options:
    flannel_backend_type: "host-gw"
```

## Configuring Calico

Calico provides advanced networking features including BGP routing and robust network policies:

```yaml
# cluster.yml
network:
  plugin: calico
  # MTU size (0 lets RKE use the plugin default)
  mtu: 1440

services:
  kube-controller:
    cluster_cidr: 10.42.0.0/16   # RKE default
    service_cluster_ip_range: 10.43.0.0/16
  kube-api:
    service_cluster_ip_range: 10.43.0.0/16
```

### Calico BGP Configuration

RKE's bundled Calico uses the BIRD backend. For environments with BGP-capable routers, create Calico BGP resources after the cluster is deployed:

```yaml
apiVersion: crd.projectcalico.org/v1
kind: BGPPeer
metadata:
  name: rack1-tor
spec:
  peerIP: 192.0.2.1
  asNumber: 64567
  nodeSelector: "rack == 'rack-1'"
```

## Custom Pod and Service CIDRs

```yaml
# cluster.yml
services:
  kube-controller:
    # Pod network CIDR (must not overlap with node network)
    cluster_cidr: 10.42.0.0/16
    # Service IP range
    service_cluster_ip_range: 10.43.0.0/16
    # Node CIDR mask size (controls how many pod IPs per node)
    extra_args:
      node-cidr-mask-size: "24"

  kube-api:
    # Must match the service_cluster_ip_range in kube-controller
    service_cluster_ip_range: 10.43.0.0/16
    # Service NodePort range
    service_node_port_range: 30000-32767
```

With a `/16` pod CIDR and `/24` node mask, each node gets 254 pod IPs.

## Configuring Network Policies

Network policies require a plugin that enforces them, such as Canal, Calico, or supported Weave deployments. Here is an example policy:

```yaml
# allow-app-traffic.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

```bash
kubectl apply -f allow-app-traffic.yaml

# Deny all traffic to a namespace by default
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
EOF
```

## Configuring MTU for Cloud Environments

In cloud environments, VXLAN encapsulation reduces the effective MTU. Configure MTU explicitly:

```yaml
# cluster.yml
# For AWS/Azure/GCP where MTU is typically 1500
network:
  plugin: canal
  # VXLAN overhead is about 50 bytes; set to 1450 for 1500 MTU hosts
  mtu: 1450
  options:
    canal_flannel_backend_type: "vxlan"
```

## Configuring a Specific Network Interface

If your nodes have multiple network interfaces, specify which one RKE should use for pod networking. RKE's Canal and Flannel interface options are set at the network plugin level:

```yaml
# cluster.yml
network:
  plugin: canal
  options:
    canal_iface: "eth1"   # Use the second NIC for pod traffic
```

For node-to-node Kubernetes component traffic on hosts with multiple addresses, configure the per-node internal address:

```yaml
nodes:
  - address: 203.0.113.101
    internal_address: 10.0.1.101
    user: ubuntu
    role: [controlplane, etcd]
```

## Verifying Network Configuration

```bash
export KUBECONFIG=kube_config_cluster.yml

# Check CNI pods are running
kubectl get pods -n kube-system | grep -E "canal|flannel|calico|weave"

# Check pod-to-pod connectivity
kubectl run pod1 --image=busybox --restart=Never --command -- sleep 3600
kubectl run pod2 --image=busybox --restart=Never --command -- sleep 3600
kubectl wait --for=condition=Ready pod/pod1 pod/pod2 --timeout=60s

# Get pod2's IP
POD2_IP=$(kubectl get pod pod2 -o jsonpath='{.status.podIP}')

# Ping from pod1 to pod2
kubectl exec pod1 -- ping -c 3 $POD2_IP

# Clean up
kubectl delete pod pod1 pod2
```

## Conclusion

RKE's network configuration is highly flexible, supporting multiple CNI plugins for different use cases. Canal is the recommended default as it combines Flannel's simplicity with Calico's network policy enforcement. Choose Calico for environments requiring BGP routing or advanced policy features. Always configure pod and service CIDRs to avoid overlaps with your existing network infrastructure, and set MTU appropriately for your cloud or physical environment.
