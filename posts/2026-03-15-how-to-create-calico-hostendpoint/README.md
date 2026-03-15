# How to Create the Calico HostEndpoint Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, HostEndpoint, Kubernetes, Node Security, Network Policy

Description: Create Calico HostEndpoint resources to apply network policies directly to host interfaces on Kubernetes nodes.

---

## Introduction

A Calico HostEndpoint resource represents a network interface on a host machine. By creating HostEndpoints, you extend Calico network policy enforcement beyond pods to the host itself. This lets you control traffic entering and leaving node interfaces, protecting the Kubernetes control plane and host-level services.

HostEndpoints are essential for securing node SSH access, restricting kubelet API exposure, and controlling traffic to host-networked pods. Without HostEndpoints, traffic to the node bypasses Calico policy entirely.

This guide covers creating HostEndpoint resources for common node security scenarios including interface binding, label-based policy targeting, and protecting critical node ports.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Knowledge of your node interface names (eth0, ens192, etc.)

## Identifying Node Interfaces

Before creating HostEndpoints, determine the interface names on your nodes:

```bash
kubectl get nodes -o wide
```

SSH into a node and list interfaces:

```bash
ip -br addr show
```

Note the primary interface name and its IP address for the HostEndpoint configuration.

## Creating a Basic HostEndpoint

Define a HostEndpoint for the primary interface on a node:

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker-1-eth0
  labels:
    node-role: worker
    environment: production
spec:
  node: worker-1
  interfaceName: eth0
  expectedIPs:
    - 10.0.1.10
```

```bash
calicoctl apply -f worker-1-hep.yaml
```

## Creating HostEndpoints for All Nodes

Define HostEndpoints for each node in your cluster:

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: control-plane-1-eth0
  labels:
    node-role: control-plane
    environment: production
spec:
  node: control-plane-1
  interfaceName: eth0
  expectedIPs:
    - 10.0.0.10
---
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker-2-eth0
  labels:
    node-role: worker
    environment: production
spec:
  node: worker-2
  interfaceName: eth0
  expectedIPs:
    - 10.0.1.11
```

```bash
calicoctl apply -f all-node-heps.yaml
```

## Applying a Policy to HostEndpoints

Once HostEndpoints exist, create a GlobalNetworkPolicy that targets them. This policy allows SSH only from a management subnet:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-ssh-from-management
spec:
  order: 100
  selector: node-role == 'worker'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        nets:
          - 10.0.100.0/24
      destination:
        ports:
          - 22
  applyOnForward: false
  preDNAT: false
```

```bash
calicoctl apply -f allow-ssh-management.yaml
```

## Enabling Auto HostEndpoints

Calico can automatically create HostEndpoints for every node. Enable this in the KubeControllersConfiguration:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  controllers:
    node:
      hostEndpoint:
        autoCreate: true
```

```bash
calicoctl apply -f auto-hep-config.yaml
```

## Verification

List all HostEndpoint resources:

```bash
calicoctl get hostendpoint -o wide
```

Inspect a specific HostEndpoint:

```bash
calicoctl get hostendpoint worker-1-eth0 -o yaml
```

Confirm the HostEndpoint is associated with the correct node:

```bash
calicoctl get hostendpoint -o yaml | grep -A5 "spec:"
```

Test that the SSH policy works by attempting to connect from the management subnet and from an unauthorized network.

## Troubleshooting

If creating a HostEndpoint causes loss of connectivity to the node, you may need a failsafe policy. Calico has built-in failsafe ports, but verify they are enabled:

```bash
calicoctl get felixconfiguration default -o yaml | grep -A10 "failsafe"
```

If the node becomes unreachable, the failsafe ports (including SSH on 22) should still be accessible. If not, access the node via console and check Felix logs:

```bash
journalctl -u calico-node --tail=50
```

Ensure the interfaceName matches exactly. A wrong interface name results in the HostEndpoint having no effect:

```bash
calicoctl get hostendpoint worker-1-eth0 -o yaml | grep interfaceName
```

## Conclusion

Calico HostEndpoint resources extend policy enforcement to node interfaces, closing a significant security gap in Kubernetes clusters. Start with auto-created HostEndpoints for broad coverage, then add custom labels for targeted policies. Always ensure failsafe ports are configured before applying restrictive policies to avoid locking yourself out of nodes.
