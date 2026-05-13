# Configure Calico Host Endpoint Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Security, Host Endpoint

Description: A step-by-step guide to configuring Calico host endpoint security policies to protect the underlying node network interfaces in your Kubernetes cluster.

---

## Introduction

Calico host endpoints allow you to apply network policy to the network interfaces of your Kubernetes nodes themselves, not just to pods. This capability extends Calico's fine-grained policy model to the host networking layer, enabling you to control traffic flowing directly to and from node processes - including the kubelet, SSH, and other system services.

By default, Kubernetes nodes have unrestricted network access. Once you enable host endpoint protection, you gain the ability to enforce allow-list or deny-list policies at the OS level. This is a critical security boundary for production clusters where lateral movement or direct node compromise must be mitigated.

This guide walks through creating and applying HostEndpoint resources along with the supporting GlobalNetworkPolicy objects needed to keep your cluster operational while enforcing strict host-level security.

## Prerequisites

- A running Kubernetes cluster with Calico installed (v3.20+)
- `kubectl` and `calicoctl` configured with cluster admin access
- Familiarity with Calico NetworkPolicy concepts
- Calico datastore access (Kubernetes API or etcd)

## Understanding Host Endpoints

A HostEndpoint resource in Calico represents a network interface on a Kubernetes node. When a HostEndpoint is created, Calico begins enforcing policy on that interface. For host endpoints without an allow-all profile, traffic is denied by default if no policy explicitly allows it, once the failsafe rules are considered. Automatically created host endpoints include Calico's default allow profile, so add explicit policy before relying on them for enforcement.

```mermaid
graph TD
    A[Kubernetes Node] --> B[eth0 Interface]
    A --> C[lo Interface]
    B --> D[HostEndpoint Resource]
    D --> E[GlobalNetworkPolicy]
    E --> F{Allow / Deny}
    F --> G[Inbound Traffic]
    F --> H[Outbound Traffic]
```

## Step 1: Enable Automatic Host Endpoint Creation

Calico can automatically create wildcard HostEndpoint resources for Kubernetes nodes. These use `interfaceName: "*"` to secure all interfaces in the host network namespace and are the recommended approach for most clusters.

```bash
calicoctl patch kubecontrollersconfiguration default \
  --patch='{"spec":{"controllers":{"node":{"hostEndpoint":{"autoCreate":"Enabled"}}}}}'
```

Add a label to the Kubernetes nodes so policies can select the automatically created host endpoints:

```bash
kubectl label nodes --all kubernetes-host=true
```

## Step 2: Create a HostEndpoint Resource

For manual creation, define a HostEndpoint for a specific node and interface:

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: node1-eth0
  labels:
    kubernetes-host: "true"
    role: worker
spec:
  interfaceName: eth0
  node: node1
  expectedIPs:
    - 10.0.1.10
```

Apply with calicoctl:

```bash
calicoctl apply -f hostendpoint.yaml
```

## Step 3: Create Failsafe GlobalNetworkPolicy

Before enforcing restrictions, create a policy that preserves essential cluster traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-cluster-internal
spec:
  selector: "has(kubernetes-host)"
  order: 0
  ingress:
    - action: Allow
      protocol: TCP
      destination:
        ports: [22, 179, 6443, 2379, 2380, 5473, 10250]
    - action: Allow
      protocol: UDP
      destination:
        ports: [68, 4789]
  egress:
    - action: Allow
      protocol: TCP
      destination:
        ports: [179, 6443, 2379, 2380, 5473, 10250]
    - action: Allow
      protocol: UDP
      destination:
        ports: [53, 67, 4789]
```

```bash
calicoctl apply -f allow-cluster-internal.yaml
```

## Step 4: Apply a Default Deny Policy

Once failsafe rules are in place, apply a lower-priority deny-all policy:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-all-host
spec:
  selector: "has(kubernetes-host)"
  order: 1000
  ingress:
    - action: Deny
  egress:
    - action: Deny
```

```bash
calicoctl apply -f deny-all-host.yaml
```

## Conclusion

Configuring Calico host endpoint security transforms your Kubernetes nodes from open network participants into policy-enforced boundaries. With HostEndpoint resources and matching GlobalNetworkPolicy objects, you can restrict exactly which traffic reaches node processes, dramatically reducing your attack surface. Always validate your failsafe policies in a staging environment before applying them to production nodes.
