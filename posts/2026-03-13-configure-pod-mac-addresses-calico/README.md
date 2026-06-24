# How to Configure Pod MAC Addresses with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, MAC Address, Networking, CNI

Description: Configure how Calico assigns and manages MAC addresses for pod network interfaces, including virtual MAC prefixes and static MAC assignment.

---

## Introduction

Calico normally allows the operating system to assign MAC addresses to pod virtual ethernet (veth) interfaces. In some setups, Calico assigns `ee:ee:ee:ee:ee:ee` to host-side `cali*` interfaces because Calico uses point-to-point routed interfaces and the host-side MAC is not used for normal data-link forwarding. When a pod needs a specific MAC address on its `eth0` interface, Calico CNI supports setting one with a pod annotation.

Understanding Calico's MAC address assignment is important for debugging layer-2 networking issues, configuring certain network security controls, and ensuring compatibility with network monitoring tools that track device identity by MAC address.

## Prerequisites

- Calico v3.20+ installed
- kubectl access to the cluster
- Access to node networking stack

## Check Pod MAC Addresses

```bash
# View MAC address of a pod interface

kubectl exec test-pod -- ip link show eth0

# View the corresponding veth on the host
ip link | grep -A1 cali

# Verify MAC address uniqueness across pods
kubectl get pods -A --no-headers -o wide | while read ns pod rest; do
  mac=$(kubectl exec -n ${ns} ${pod} -- ip link show eth0 2>/dev/null | grep -oP '([0-9a-f]{2}:){5}[0-9a-f]{2}' | head -1)
  echo "${ns}/${pod}: ${mac}"
done | sort -t: -k2
```

## Configure Static Pod MAC Address

Calico CNI allows configuring a specific MAC address for a pod interface with the `cni.projectcalico.org/hwAddr` annotation. The annotation must be present when the pod is created; adding it later does not update an existing pod interface.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  annotations:
    cni.projectcalico.org/hwAddr: "1c:0c:0a:c0:ff:ee"
spec:
  containers:
  - name: test
    image: busybox:1.36
    command: ["sleep", "3600"]
```

## Check for MAC Conflicts

```bash
# Look for duplicate MACs in the neighbor table
ip neigh show | awk '{print $5}' | grep -E '([0-9a-f]{2}:){5}[0-9a-f]{2}' | sort | uniq -d
```

## MAC Address Architecture

```mermaid
graph LR
    subgraph Pod
        ETH0[eth0\nOS-assigned or annotated MAC]
    end
    subgraph Node
        VETH[caliXXXXXXXX\nhost side of veth pair\noften ee:ee:ee:ee:ee:ee]
        ARP[ARP Table\nPod IP -> MAC]
    end
    ETH0 <--> VETH
    VETH --> ARP
```

## Conclusion

Calico's MAC address management for pods usually relies on the operating system, with explicit per-pod MAC assignment available through the Calico CNI annotation. Monitoring for MAC conflicts and understanding the MAC assignment scheme helps diagnose layer-2 networking issues and configure security controls appropriately in your Kubernetes environment.
