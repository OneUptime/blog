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

## Step 1: Confirm CNI Plugins Are Available on Talos

Multus needs the CNI binary directory and configuration directory to be accessible. On Talos Linux, these are at the standard locations: `/opt/cni/bin` for binaries and `/etc/cni/net.d` for configuration.

Starting with Talos v1.8, the standard reference CNI plugins (including `macvlan`, `bridge`, `host-device`, `host-local`, `static`, `loopback`, `ipvlan`, `tuning`, etc.) are bundled with Talos itself, so no extra installation is required for these common plugin types. You can confirm what is present on a node with:

```bash
# List CNI binaries on a worker node
talosctl -n 192.168.1.20 list /opt/cni/bin/
```

If you need a specialized CNI binary that is not bundled (for example, an SR-IOV plugin), you will need to build a custom Talos system extension that drops the binary into `/opt/cni/bin`, since Talos is immutable and you cannot install packages on the running OS.

## Step 2: Install Multus Using the Thick Plugin Method

There are two deployment models for Multus: thin plugin and thick plugin. The thick plugin is recommended for Talos Linux because it runs a long-lived daemon on each node and is the model that Sidero Labs documents for Talos.

Apply the upstream thick DaemonSet manifest as a starting point:

```bash
kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset-thick.yml
```

There is one Talos-specific patch you must apply. Talos exposes the network namespace directory at `/var/run/netns` rather than `/run/netns`, so the `host-run-netns` hostPath in the DaemonSet has to be retargeted. If you do not apply this patch, pods will fail to start with sandbox / netns errors after Multus takes over CNI configuration.

You can patch the running DaemonSet with:

```bash
kubectl -n kube-system patch daemonset kube-multus-ds \
  --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/volumes/<INDEX>","value":{"name":"host-run-netns","hostPath":{"path":"/var/run/netns/"}}}]'
```

Replace `<INDEX>` with the position of the `host-run-netns` volume in the manifest (inspect with `kubectl -n kube-system get ds kube-multus-ds -o yaml` first).

A cleaner approach is to download the manifest, edit the `host-run-netns` volume in place, and apply the edited copy:

```yaml
# In multus-daemonset-thick.yml, change:
- name: host-run-netns
  hostPath:
    path: /run/netns/
# to:
- name: host-run-netns
  hostPath:
    path: /var/run/netns/
```

Then apply and verify:

```bash
kubectl apply -f multus-daemonset-thick.yml

# Verify Multus pods are running on all nodes
kubectl get pods -n kube-system -l app=multus -o wide
```

The upstream manifest pins a known-good Multus image (currently in the `v4.x` series) and includes the correct daemon command (`/usr/src/multus-cni/bin/multus-daemon`), an `install-multus-binary` init container that drops the Multus CNI binary into `/opt/cni/bin`, and the ConfigMap with the daemon settings - you do not need to assemble any of that yourself.

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
