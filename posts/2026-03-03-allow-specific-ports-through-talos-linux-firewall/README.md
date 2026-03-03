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
spec:
  ingress:
    - subnet: 0.0.0.0/0
      protocol: tcp
      ports:
        - 443
```

This allows TCP traffic on port 443 from any source. Use `0.0.0.0/0` cautiously - it means "from everywhere." For most internal services, restrict the source to your network's CIDR range.

## Opening Ports for the Talos API

The Talos API should only be accessible from your management network:

```yaml
# Allow Talos API from management network only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-talos-api
spec:
  ingress:
    - subnet: 10.10.0.0/24    # Management VLAN
      protocol: tcp
      ports:
        - 50000

    - subnet: 172.16.100.0/24  # VPN network
      protocol: tcp
      ports:
        - 50000
```

Never open the Talos API to the public internet. Anyone with access to the Talos API and valid credentials can fully control your nodes.

## Opening Ports for Kubernetes API

The Kubernetes API server needs to be accessible from worker nodes, admin workstations, and any CI/CD systems:

```yaml
# Allow Kubernetes API access
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-kubernetes-api
spec:
  ingress:
    # From all cluster nodes
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 6443

    # From admin workstations
    - subnet: 192.168.1.0/24
      protocol: tcp
      ports:
        - 6443

    # From CI/CD runners
    - subnet: 172.16.50.0/24
      protocol: tcp
      ports:
        - 6443
```

## Opening Ports for etcd

etcd ports should be strictly limited to control plane nodes:

```yaml
# Allow etcd traffic between control plane nodes only
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-etcd
spec:
  ingress:
    # etcd client port - from control plane subnet
    - subnet: 10.0.1.0/29     # Tight subnet covering only CP nodes
      protocol: tcp
      ports:
        - 2379

    # etcd peer port - from control plane subnet
    - subnet: 10.0.1.0/29
      protocol: tcp
      ports:
        - 2380
```

Use the tightest possible subnet that covers your control plane nodes. If your control plane nodes are at 10.0.1.1, 10.0.1.2, and 10.0.1.3, a /29 subnet (10.0.1.0/29) is appropriate.

## Opening Ports for Monitoring

Monitoring tools like Prometheus need access to metrics endpoints:

```yaml
# Allow monitoring traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-monitoring
spec:
  ingress:
    # Node exporter metrics
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 9100

    # Kubelet metrics
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 10250

    # Kube-proxy metrics
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 10249

    # etcd metrics (control plane only)
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 2381
```

## Opening Ports for CNI Plugins

Your CNI plugin uses specific ports for overlay networking and health checks:

```yaml
# Allow Cilium CNI traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-cilium
spec:
  ingress:
    # Cilium health checks
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 4240

    # VXLAN overlay
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 8472

    # Hubble relay
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 4244

    # WireGuard (if using encrypted overlay)
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 51871
```

For Calico:

```yaml
# Allow Calico CNI traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-calico
spec:
  ingress:
    # BGP peering
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 179

    # VXLAN overlay
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 4789

    # Typha
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 5473
```

## Opening Ports for NodePort Services

NodePort services use ports in the 30000-32767 range:

```yaml
# Allow NodePort traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeports
spec:
  ingress:
    # TCP NodePorts from internal network
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 30000-32767

    # UDP NodePorts from internal network
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 30000-32767
```

If you expose NodePort services to the internet (through a load balancer or directly), widen the subnet accordingly. But generally, NodePort access should be restricted to your internal network.

## Opening Ports for MetalLB

If you use MetalLB for load balancing:

```yaml
# Allow MetalLB traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-metallb
spec:
  ingress:
    # MetalLB speaker (memberlist)
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 7946

    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 7946

    # BGP (if using BGP mode)
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 179
```

## Combining Rules Efficiently

Instead of creating many small rule documents, group related rules:

```yaml
# Comprehensive control plane rules
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: control-plane-all
spec:
  ingress:
    # Management access
    - subnet: 10.10.0.0/24
      protocol: tcp
      ports:
        - 50000
        - 6443

    # Cluster internal - control plane services
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 6443
        - 2379
        - 2380
        - 10250
        - 10257
        - 10259

    # Monitoring
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 2381
        - 9100

    # CNI (Cilium)
    - subnet: 10.0.0.0/8
      protocol: tcp
      ports:
        - 4240
    - subnet: 10.0.0.0/8
      protocol: udp
      ports:
        - 8472
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
