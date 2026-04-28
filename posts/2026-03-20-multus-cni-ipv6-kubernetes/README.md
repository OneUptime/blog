# How to Configure Multus CNI for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Multus, CNI, IPv6, Kubernetes, Multiple Networks, Macvlan, IPvlan

Description: Configure Multus CNI to attach multiple IPv6 network interfaces to Kubernetes pods, enabling pods to participate in multiple IPv6 networks simultaneously.

## Introduction

Multus CNI allows Kubernetes pods to have multiple network interfaces. This is useful for network functions, telco workloads, and applications that need separate data plane and management plane interfaces - each potentially with different IPv6 addresses.

## Step 1: Install Multus

```bash
# Install Multus

kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml

# Verify
kubectl get pods -n kube-system | grep multus
```

## Step 2: Create an IPv6 NetworkAttachmentDefinition

```yaml
# ipv6-macvlan-nad.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipv6-macvlan
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "ipv6-macvlan",
      "type": "macvlan",
      "master": "eth1",
      "mode": "bridge",
      "ipam": {
        "type": "static",
        "addresses": [
          {
            "address": "2001:db8:2::10/64",
            "gateway": "2001:db8:2::1"
          }
        ],
        "routes": [
          { "dst": "::/0" }
        ]
      }
    }
```

```bash
kubectl apply -f ipv6-macvlan-nad.yaml
```

## Step 3: DHCP-Based IPv6 Assignment

```yaml
# ipv6-dhcp-nad.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipv6-dhcp-net
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "ipv6-dhcp-net",
      "type": "ipvlan",
      "master": "eth1",
      "mode": "l3",
      "ipam": {
        "type": "dhcp"
      }
    }
```

## Step 4: Attach Multiple IPv6 Networks to a Pod

```yaml
# multi-network-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-ipv6-pod
  annotations:
    # Attach both networks
    k8s.v1.cni.cncf.io/networks: |
      [
        {
          "name": "ipv6-macvlan",
          "namespace": "default",
          "interface": "net1"
        },
        {
          "name": "ipv6-dhcp-net",
          "namespace": "default",
          "interface": "net2"
        }
      ]
spec:
  containers:
    - name: app
      image: nicolaka/netshoot
      command: ["/bin/bash", "-c", "sleep infinity"]
```

```bash
kubectl apply -f multi-network-pod.yaml

# Verify interfaces inside the pod
kubectl exec multi-ipv6-pod -- ip -6 addr show
# eth0: default Kubernetes network
# net1: macvlan IPv6 interface
# net2: DHCP IPv6 interface
```

## Step 5: Static IPv6 Assignment Per Pod

```yaml
# pod-with-static-ipv6.yaml
apiVersion: v1
kind: Pod
metadata:
  name: static-ipv6-pod
  annotations:
    k8s.v1.cni.cncf.io/networks: |
      [
        {
          "name": "ipv6-macvlan",
          "namespace": "default",
          "interface": "net1",
          "ips": ["2001:db8:2::42/64"]
        }
      ]
spec:
  containers:
    - name: app
      image: nginx
```

## Step 6: Verify Multi-Network IPv6

```bash
# Check pod network status annotation
kubectl get pod multi-ipv6-pod -o jsonpath='{.metadata.annotations.k8s\.v1\.cni\.cncf\.io/network-status}' | python3 -m json.tool

# Expected output includes all interfaces with IPv6:
# [{
#   "name": "", "interface": "eth0", "ips": ["10.244.0.5", "fd00:10:244::5"]
# }, {
#   "name": "default/ipv6-macvlan", "interface": "net1", "ips": ["2001:db8:2::10"]
# }]

# Test connectivity on each interface
kubectl exec multi-ipv6-pod -- ping6 -I net1 2001:db8:2::1
kubectl exec multi-ipv6-pod -- ping6 -I eth0 fd00:10:244::1
```

## Conclusion

Multus CNI enables pods to have multiple IPv6 interfaces, essential for network functions and workloads requiring separate traffic planes. Use `NetworkAttachmentDefinition` with IPAM `static` for fixed IPv6 addresses and `dhcp` for dynamic allocation. Verify all interfaces via the `k8s.v1.cni.cncf.io/network-status` annotation. Monitor multi-homed pod network health with OneUptime checks on each interface's IPv6 address.
