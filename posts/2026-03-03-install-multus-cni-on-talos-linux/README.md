# How to Install Multus CNI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Multus CNI, Kubernetes, Networking, Multi-Network

Description: Learn how to install and configure Multus CNI on Talos Linux to attach multiple network interfaces to your Kubernetes pods.

---

In standard Kubernetes, each pod gets exactly one network interface (besides loopback). For most applications, that is fine. But there are workloads that need multiple network interfaces - network functions, telecom applications, storage appliances, or applications that need to separate management traffic from data traffic. Multus CNI solves this by letting you attach multiple networks to a single pod. Setting it up on Talos Linux takes some extra effort because of the immutable nature of the OS.

## What Multus Does

Multus is a meta-CNI plugin. It does not provide networking itself. Instead, it delegates to other CNI plugins. You keep your primary CNI (like Cilium, Calico, or Flannel) for the default pod network, and Multus adds additional interfaces from other CNI plugins.

For example, a pod could have:
- eth0 - Connected to the cluster network via Cilium (primary)
- net1 - Connected to a VLAN via macvlan for direct hardware access
- net2 - Connected to an SR-IOV interface for high-performance networking

Each additional interface is defined using a NetworkAttachmentDefinition custom resource.

## Prerequisites

Before installing Multus on Talos Linux, you need:

- A working Talos Linux cluster with a primary CNI already installed
- kubectl and talosctl configured
- Understanding of your secondary network requirements

## Step 1: Configure Talos for Multus

Multus needs the CNI binary directory and configuration directory to be accessible. On Talos Linux, these are at standard locations, but you may need to configure additional CNI plugins as extensions.

If you need additional CNI plugins like macvlan, bridge, or host-device, they should be available on the node. Talos Linux includes basic CNI plugins, but you may need to add more through system extensions:

```yaml
# talos-multus-patch.yaml
machine:
  install:
    extensions:
      # Include additional CNI plugins if needed
      - image: ghcr.io/siderolabs/cni-plugins:v1.4.0
  # Ensure the CNI directories are properly configured
  kubelet:
    extraArgs:
      cni-bin-dir: /opt/cni/bin
      cni-conf-dir: /etc/cni/net.d
```

Apply the patch to all nodes that will use Multus:

```bash
# Apply to worker nodes
talosctl apply-config --nodes 192.168.1.20 --patch @talos-multus-patch.yaml
talosctl apply-config --nodes 192.168.1.21 --patch @talos-multus-patch.yaml
```

## Step 2: Install Multus Using the Thick Plugin Method

There are two deployment models for Multus: thin plugin and thick plugin. The thick plugin is recommended for Talos Linux because it bundles everything into a single DaemonSet.

```bash
# Install Multus thick plugin
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset-thick.yml
```

Or install with a custom configuration:

```yaml
# multus-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-multus-ds
  namespace: kube-system
  labels:
    tier: node
    app: multus
    name: multus
spec:
  selector:
    matchLabels:
      name: multus
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        tier: node
        app: multus
        name: multus
    spec:
      hostNetwork: true
      tolerations:
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
      serviceAccountName: multus
      containers:
      - name: kube-multus
        image: ghcr.io/k8snetworkplumbingwg/multus-cni:v4.0.2-thick
        command: ["/thick-entrypoint.sh"]
        args:
        - "--multus-conf-file=auto"
        - "--multus-autoconfig-dir=/host/etc/cni/net.d"
        - "--cni-conf-dir=/host/etc/cni/net.d"
        resources:
          requests:
            cpu: "100m"
            memory: "50Mi"
          limits:
            cpu: "100m"
            memory: "50Mi"
        securityContext:
          privileged: true
        volumeMounts:
        - name: cni
          mountPath: /host/etc/cni/net.d
        - name: cnibin
          mountPath: /host/opt/cni/bin
      volumes:
      - name: cni
        hostPath:
          path: /etc/cni/net.d
      - name: cnibin
        hostPath:
          path: /opt/cni/bin
```

```bash
# Apply the DaemonSet
kubectl apply -f multus-daemonset.yaml

# Verify Multus pods are running on all nodes
kubectl get pods -n kube-system -l app=multus -o wide
```

## Step 3: Create Network Attachment Definitions

Now create secondary network definitions. Here are examples for common scenarios:

### Macvlan Network

Macvlan creates virtual interfaces that share the physical interface but have their own MAC addresses:

```yaml
# macvlan-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-data
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "eth1",
      "mode": "bridge",
      "ipam": {
        "type": "host-local",
        "subnet": "192.168.100.0/24",
        "rangeStart": "192.168.100.100",
        "rangeEnd": "192.168.100.200",
        "gateway": "192.168.100.1"
      }
    }
```

### Bridge Network

A Linux bridge network for connecting multiple pods on the same host:

```yaml
# bridge-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: bridge-storage
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "bridge",
      "bridge": "storage-br0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "subnet": "172.16.0.0/24",
        "routes": [
          { "dst": "0.0.0.0/0" }
        ]
      }
    }
```

### Static IP Network

For applications that need fixed IP addresses:

```yaml
# static-ip-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: static-network
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "type": "macvlan",
      "master": "eth1",
      "mode": "bridge",
      "ipam": {
        "type": "static",
        "addresses": [
          {
            "address": "192.168.200.10/24"
          }
        ]
      }
    }
```

Apply the network definitions:

```bash
kubectl apply -f macvlan-network.yaml
kubectl apply -f bridge-network.yaml

# List available networks
kubectl get network-attachment-definitions
```

## Step 4: Attach Networks to Pods

Use annotations to attach secondary networks to your pods:

```yaml
# multi-network-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-net-pod
  annotations:
    # Attach the macvlan-data network
    k8s.v1.cni.cncf.io/networks: macvlan-data
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sleep", "3600"]
```

For multiple additional networks:

```yaml
# pod-with-multiple-networks.yaml
apiVersion: v1
kind: Pod
metadata:
  name: triple-net-pod
  annotations:
    # Attach multiple networks with custom interface names
    k8s.v1.cni.cncf.io/networks: |
      [
        {
          "name": "macvlan-data",
          "interface": "data0"
        },
        {
          "name": "bridge-storage",
          "interface": "stor0"
        }
      ]
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sleep", "3600"]
```

```bash
# Deploy the pod
kubectl apply -f multi-network-pod.yaml

# Check that extra interfaces were created
kubectl exec multi-net-pod -- ip addr show

# You should see:
# 1: lo
# 2: eth0 (primary cluster network)
# 3: net1 or data0 (macvlan network from Multus)
```

## Step 5: Verify and Test

```bash
# Check the pod's network status annotation
kubectl get pod multi-net-pod -o jsonpath='{.metadata.annotations.k8s\.v1\.cni\.cncf\.io/network-status}' | python3 -m json.tool

# Test connectivity on the secondary interface
kubectl exec multi-net-pod -- ping -I net1 192.168.100.1

# Check routing table inside the pod
kubectl exec multi-net-pod -- ip route
```

## Troubleshooting on Talos Linux

If Multus is not working:

```bash
# Check Multus logs
kubectl logs -n kube-system -l app=multus --tail=100

# Verify the CNI config was generated
# Multus should create a config file in /etc/cni/net.d/
talosctl -n 192.168.1.20 list /etc/cni/net.d/

# Check if the CNI binaries are available
talosctl -n 192.168.1.20 list /opt/cni/bin/

# Common issue: missing CNI binary for the secondary network type
# Solution: Install the cni-plugins extension through Talos
```

The most common issue on Talos Linux is missing CNI plugin binaries. Since Talos is immutable, you cannot install packages directly. Use Talos system extensions to add the needed binaries.

## Summary

Multus CNI on Talos Linux enables multi-network pods for specialized workloads that need more than one network interface. Install Multus as a thick DaemonSet, create NetworkAttachmentDefinitions for your secondary networks, and annotate pods to attach them. The main Talos-specific consideration is ensuring the required CNI plugin binaries are available through system extensions. With Multus running, your Talos Linux cluster can handle advanced networking scenarios that go beyond what a single CNI plugin provides.
