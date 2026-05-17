# How to Allow Specific Ports Through Talos Linux Firewall

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Firewall, Port Management, Network Security, Kubernetes

Description: A practical guide to opening specific ports through the Talos Linux host firewall for services, monitoring, and application traffic.

---

When you configure the Talos Linux firewall using NetworkRuleConfig documents, the firewall adopts a default-deny stance. Only traffic that matches an explicit rule gets through. This means you need to carefully identify which ports each service needs and create rules to allow them. Getting this wrong either leaves your services inaccessible or creates security holes by opening too many ports.

This guide provides a systematic approach to identifying required ports and creating precise firewall rules for different services and use cases in Talos Linux.

## Identifying Required Ports

Before writing any rules, you need to know which ports your services use. Here is a reference for the most common ports in a Talos Linux Kubernetes cluster:

**Talos System Ports:**
- 50000/tcp - Talos API (apid)
- 50001/tcp - Talos trustd (certificate handling)

**Kubernetes Control Plane Ports:**
- 6443/tcp - Kubernetes API server
- 2379/tcp - etcd client
- 2380/tcp - etcd peer
- 10250/tcp - Kubelet API
- 10257/tcp - kube-controller-manager
- 10259/tcp - kube-scheduler

**Kubernetes Worker Ports:**
- 10250/tcp - Kubelet API
- 30000-32767/tcp - NodePort services (default range)

## Opening a Single Port

The simplest case is allowing traffic on a single port from a specific network:

```yaml
# Allow HTTPS traffic on port 443

apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-https
portSelector:
  ports:
    - 443
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
```

This allows TCP traffic on port 443 from any source. Use `0.0.0.0/0` cautiously - it means "from everywhere." For most internal services, restrict the source to your network's CIDR range.

## Opening Ports for the Talos API

The Talos API should only be accessible from your management network:

```yaml
# Allow Talos API from management network only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-talos-api
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24    # Management VLAN
  - subnet: 172.16.100.0/24  # VPN network
```

Never open the Talos API to the public internet. Anyone with access to the Talos API and valid credentials can fully control your nodes.

## Opening Ports for Kubernetes API

The Kubernetes API server needs to be accessible from worker nodes, admin workstations, and any CI/CD systems:

```yaml
# Allow Kubernetes API access
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-kubernetes-api
portSelector:
  ports:
    - 6443
  protocol: tcp
ingress:
  # From all cluster nodes
  - subnet: 10.0.0.0/8
  # From admin workstations
  - subnet: 192.168.1.0/24
  # From CI/CD runners
  - subnet: 172.16.50.0/24
```

## Opening Ports for etcd

etcd ports should be strictly limited to control plane nodes:

```yaml
# Allow etcd traffic between control plane nodes only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-etcd
portSelector:
  ports:
    - 2379
    - 2380
  protocol: tcp
ingress:
  # Tight subnet covering only control plane nodes
  - subnet: 10.0.1.0/29
```

Use the tightest possible subnet that covers your control plane nodes. If your control plane nodes are at 10.0.1.1, 10.0.1.2, and 10.0.1.3, a /29 subnet (10.0.1.0/29) is appropriate.

## Opening Ports for Monitoring

Monitoring tools like Prometheus need access to metrics endpoints:

```yaml
# Allow monitoring traffic - groups all TCP metrics ports
# (node exporter 9100, kubelet 10250, kube-proxy 10249, etcd metrics 2381)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-monitoring
portSelector:
  ports:
    - 9100
    - 10249
    - 10250
    - 2381
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

## Opening Ports for CNI Plugins

Your CNI plugin uses specific ports for overlay networking and health checks:

```yaml
# Allow Cilium CNI traffic - one document per protocol because
# portSelector takes a single protocol per NetworkRuleConfig

# Cilium TCP ports: health checks (4240) and Hubble server (4244)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-cilium-tcp
portSelector:
  ports:
    - 4240
    - 4244
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# Cilium UDP ports: VXLAN overlay (8472) and WireGuard (51871, if used)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-cilium-udp
portSelector:
  ports:
    - 8472
    - 51871
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
```

For Calico:

```yaml
# Allow Calico CNI traffic - BGP peering (179) and Typha (5473)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-calico-tcp
portSelector:
  ports:
    - 179
    - 5473
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# Calico VXLAN overlay
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-calico-vxlan
portSelector:
  ports:
    - 4789
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
```

## Opening Ports for NodePort Services

NodePort services use ports in the 30000-32767 range:

```yaml
# Allow TCP NodePorts from internal network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeports-tcp
portSelector:
  ports:
    - 30000-32767
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# Allow UDP NodePorts from internal network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeports-udp
portSelector:
  ports:
    - 30000-32767
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
```

If you expose NodePort services to the internet (through a load balancer or directly), widen the subnet accordingly. But generally, NodePort access should be restricted to your internal network.

## Opening Ports for MetalLB

If you use MetalLB for load balancing:

```yaml
# MetalLB TCP - speaker memberlist (7946) and BGP (179, if using BGP mode)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-metallb-tcp
portSelector:
  ports:
    - 179
    - 7946
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# MetalLB UDP - speaker memberlist
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-metallb-udp
portSelector:
  ports:
    - 7946
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
```

## Combining Rules Efficiently

Each `NetworkRuleConfig` document carries a single `portSelector` (one protocol, one set of ports) and a list of source subnets. To cover a node end-to-end you stitch together multiple documents in the same machine config patch, separated by `---`:

```yaml
# Management access - Talos API and Kubernetes API from the management VLAN
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cp-management
portSelector:
  ports:
    - 6443
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24
---
# Cluster internal - control plane TCP services
# (kube-apiserver, etcd client/peer, kubelet, controller-manager, scheduler)
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cp-internal-tcp
portSelector:
  ports:
    - 2379
    - 2380
    - 6443
    - 10250
    - 10257
    - 10259
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# Monitoring - etcd metrics and node exporter
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cp-monitoring
portSelector:
  ports:
    - 2381
    - 9100
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# CNI (Cilium) - health checks
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cp-cilium-tcp
portSelector:
  ports:
    - 4240
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
# CNI (Cilium) - VXLAN overlay
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cp-cilium-vxlan
portSelector:
  ports:
    - 8472
  protocol: udp
ingress:
  - subnet: 10.0.0.0/8
```

## Applying Port Rules

Apply your rules to the appropriate nodes:

```bash
# Apply to control plane nodes
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml \
  --config-patch @control-plane-rules.yaml

# Apply to worker nodes
talosctl apply-config \
  --nodes 192.168.1.110 \
  --file worker.yaml \
  --config-patch @worker-rules.yaml
```

## Testing Port Access

After applying rules, verify each port is accessible from the intended sources:

```bash
# Test Talos API access
talosctl get members --nodes 192.168.1.100

# Test Kubernetes API access
kubectl --server=https://192.168.1.100:6443 get nodes

# Test from a pod within the cluster
kubectl run nettest --image=busybox --rm -it -- wget -T 5 -q -O- http://192.168.1.100:9100/metrics
```

## Best Practices

Open only the ports you actually need. If you are not sure whether a port is needed, leave it closed and see if anything breaks. Use the narrowest possible source subnet for each rule. Document every open port with a comment explaining why it is needed. Review your port rules quarterly and close any that are no longer necessary. Different node roles should have different rule sets - do not apply control plane rules to worker nodes or vice versa.

A well-configured firewall with specific port allowances is one of the most effective security measures you can implement on Talos Linux. Take the time to identify exactly which ports need to be open, and keep everything else closed.
