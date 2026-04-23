# How to Configure RKE2 with Multus for Multi-Network Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, Multus, Networking, CNI

Description: Learn how to deploy and configure Multus CNI with RKE2 to enable pods to attach to multiple network interfaces simultaneously.

## Introduction

Multus CNI is a meta-plugin that allows Kubernetes pods to be connected to multiple networks simultaneously. This is especially useful for telco, edge, and high-performance computing workloads that require separate data-plane and management-plane networks. RKE2 supports Multus through its built-in CNI plugin configuration.

## Use Cases for Multus

- Separating application traffic from storage or management traffic
- Providing direct hardware access via SR-IOV
- Connecting to legacy VLANs or bare-metal networks
- Telecom Network Functions (CNFs) requiring multiple interfaces

## Prerequisites

- RKE2 cluster on a currently supported release
- Multiple network interfaces on your nodes
- Sudo access to create RKE2 configuration and manifest files

## Step 1: Enable Multus in RKE2 Configuration

RKE2 has built-in support for deploying Multus as a secondary CNI. Configure it in your server's `config.yaml`:

```yaml
# /etc/rancher/rke2/config.yaml

# Multus must be first, followed by the primary/default CNI plugin
cni:
  - multus
  - canal  # or flannel, calico, cilium
```

This tells RKE2 to deploy Multus as the CNI entry point, with Canal (or your chosen CNI) as the delegate for the default network.

```bash
# Apply the configuration and start RKE2
sudo mkdir -p /etc/rancher/rke2
sudo tee /etc/rancher/rke2/config.yaml > /dev/null <<EOF
cni:
  - multus
  - canal
EOF

# Install and start RKE2
curl -sfL https://get.rke2.io | sudo sh -
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service
```

## Step 2: Verify Multus Deployment

```bash
# Set up kubectl
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

# Verify the Multus DaemonSet is running
kubectl -n kube-system get daemonset rke2-multus

# Verify the Multus pods are ready
kubectl -n kube-system get pods -l app=rke2-multus

# Check that the Multus CNI binary is installed on nodes
ls /opt/cni/bin/multus
```

## Step 3: Create a NetworkAttachmentDefinition

A `NetworkAttachmentDefinition` (NAD) defines the additional network you want to attach to pods.

The following examples use `host-local` IPAM, which stores allocations on each node. Use it for single-node clusters, tests, or non-overlapping per-node ranges; use Whereabouts later in this guide for cluster-wide IP allocation.

### Using macvlan (for connecting to a physical network)

```bash
kubectl apply -f - <<EOF
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-conf
  namespace: default
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "mode": "bridge",
    "ipam": {
      "type": "host-local",
      "ranges": [[{
        "subnet": "192.168.2.0/24",
        "rangeStart": "192.168.2.200",
        "rangeEnd": "192.168.2.250",
        "gateway": "192.168.2.1"
      }]]
    }
  }'
EOF
```

### Using ipvlan

```bash
kubectl apply -f - <<EOF
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipvlan-conf
  namespace: default
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "ipvlan",
    "master": "eth1",
    "mode": "l2",
    "ipam": {
      "type": "host-local",
      "ranges": [[{
        "subnet": "10.10.0.0/24"
      }]]
    }
  }'
EOF
```

### Using a VLAN

```bash
kubectl apply -f - <<EOF
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: vlan100
  namespace: default
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "vlan",
    "master": "eth1",
    "vlanId": 100,
    "ipam": {
      "type": "host-local",
      "ranges": [[{
        "subnet": "10.100.0.0/24"
      }]]
    }
  }'
EOF
```

## Step 4: Attach the Network to a Pod

Annotate your pod with the `k8s.v1.cni.cncf.io/networks` annotation to attach one or more additional networks:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multus-demo
  namespace: default
  annotations:
    # Attach the macvlan network as a second interface (net1)
    k8s.v1.cni.cncf.io/networks: macvlan-conf
spec:
  containers:
    - name: multus-demo
      image: alpine
      command: ["sleep", "3600"]
      resources:
        requests:
          cpu: "100m"
          memory: "64Mi"
```

To attach multiple networks:

```yaml
annotations:
  # Attach two additional networks
  k8s.v1.cni.cncf.io/networks: macvlan-conf, ipvlan-conf
```

To specify interface names:

```yaml
annotations:
  # Name the interfaces explicitly
  k8s.v1.cni.cncf.io/networks: '[
    {"name": "macvlan-conf", "interface": "net1"},
    {"name": "ipvlan-conf", "interface": "net2"}
  ]'
```

## Step 5: Verify Multi-Network Connectivity

```bash
# Exec into the pod and check interfaces
kubectl exec -it multus-demo -- ip addr show

# You should see:
# eth0 - primary CNI interface (from Canal/Flannel)
# net1  - secondary interface from macvlan-conf
```

## Step 6: Using Whereabouts for IPAM

For dynamic IP assignment across multiple nodes, use the Whereabouts IPAM plugin:

```bash
# Enable the bundled RKE2 Whereabouts dependency for Multus
sudo mkdir -p /var/lib/rancher/rke2/server/manifests
sudo tee /var/lib/rancher/rke2/server/manifests/rke2-multus-config.yaml > /dev/null <<EOF
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-multus
  namespace: kube-system
spec:
  valuesContent: |-
    rke2-whereabouts:
      enabled: true
EOF

# Create a NAD using Whereabouts IPAM
kubectl apply -f - <<EOF
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-whereabouts
  namespace: default
spec:
  config: '{
    "cniVersion": "0.3.1",
    "type": "macvlan",
    "master": "eth1",
    "mode": "bridge",
    "ipam": {
      "type": "whereabouts",
      "range": "192.168.3.0/24",
      "exclude": ["192.168.3.0/32", "192.168.3.255/32"]
    }
  }'
EOF
```

## Conclusion

Multus CNI extends RKE2 clusters with the ability to attach pods to multiple networks, enabling advanced networking patterns for telco, edge, and HPC workloads. By configuring `cni: [multus, canal]` in your RKE2 config and creating `NetworkAttachmentDefinition` resources, you can provide pods with dedicated interfaces for different traffic types. For production deployments, combine Multus with Whereabouts for cluster-wide IP address management.
