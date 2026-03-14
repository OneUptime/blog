# How to Install Calico on Bare Metal with Containers Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Installation

Description: A step-by-step guide to installing Calico as the CNI plugin on a Kubernetes cluster running containerized workloads on bare metal servers.

---

## Introduction

Bare metal Kubernetes clusters running containerized workloads get the best performance when paired with a CNI plugin that can operate without encapsulation overhead. Calico is purpose-built for this use case - it can route pod traffic natively using BGP, eliminating VXLAN or IPIP tunneling and delivering bare-metal-level network performance to containers.

Installing Calico on bare metal with containers follows the same core operator-based workflow as other environments, but the configuration choices differ. You will typically want to disable overlay encapsulation, configure BGP to your physical switches, and tune the MTU to match your NIC's maximum frame size.

This guide walks through a complete Calico installation on a bare metal Kubernetes cluster running containerized workloads.

## Prerequisites

- Bare metal servers running Linux with kernel 4.19+
- Kubernetes cluster bootstrapped with kubeadm, no CNI installed
- Physical or virtual network switches that support BGP (optional but recommended)
- `kubectl` with cluster admin access
- Container runtime (containerd or CRI-O) installed and running

## Step 1: Prepare Nodes

Ensure the container runtime is running on all nodes.

```bash
systemctl status containerd
systemctl status kubelet
```

Label nodes for role identification:

```bash
kubectl label node <master-node> node-role.kubernetes.io/control-plane=
kubectl label node <worker-node> node-role.kubernetes.io/worker=
```

## Step 2: Install the Tigera Operator

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 3: Create the Installation Resource

For bare metal with containers, disable IPIP encapsulation if your network supports native BGP routing:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: None
      natOutgoing: Enabled
      nodeSelector: all()
    mtu: 1500
```

```bash
kubectl apply -f calico-installation.yaml
```

## Step 4: Monitor Calico Initialization

```bash
kubectl get tigerastatus -w
kubectl get pods -n calico-system -w
```

Wait for `calico-node`, `calico-kube-controllers`, and `calico-typha` to reach `Running` state.

## Step 5: Verify Node Readiness

```bash
kubectl get nodes
```

All nodes should show `Ready` status once `calico-node` completes initialization.

## Step 6: Verify Pod Networking

```bash
kubectl run test --image=busybox -- sleep 300
kubectl get pod test -o wide
calicoctl ipam show
kubectl delete pod test
```

## Conclusion

Installing Calico on bare metal Kubernetes clusters with containers involves deploying the Tigera Operator, creating an Installation CR with BGP-optimized settings, and verifying that all nodes become Ready and pods receive IP addresses from the configured pool. The container runtime handles pod lifecycle, while Calico handles all pod-level networking.
