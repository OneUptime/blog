# How to Install Calico on Kind Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, Kind

Description: A complete step-by-step guide to installing the Calico CNI plugin on a Kind (Kubernetes in Docker) cluster.

---

## Introduction

Kind (Kubernetes in Docker) is a popular tool for running local Kubernetes clusters using Docker containers as nodes. It is widely used for development and testing purposes. While Kind ships with a basic networking setup, many teams prefer to use Calico as their CNI plugin to leverage advanced network policy support and consistent behavior with production clusters.

Calico is a powerful open-source networking and network security solution for containers and Kubernetes. It provides fine-grained network policy enforcement, IP-in-IP or VXLAN encapsulation modes, and BGP-based routing. Installing Calico on Kind allows you to test network policies locally before deploying to production.

This guide walks you through creating a Kind cluster without a default CNI, then installing Calico using the official manifest. By the end, your Kind cluster will have Calico managing pod networking and enforcing network policies.

## Prerequisites

- Docker installed and running
- Kind CLI installed (`kind` v0.20+)
- kubectl installed and configured
- Internet access to pull Calico manifests

## Step 1: Create a Kind Cluster Without Default CNI

Kind installs kindnet as its default CNI. To use Calico, you must disable it at cluster creation time by providing a custom configuration.

Create a file named `kind-calico.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  disableDefaultCNI: true
  podSubnet: "192.168.0.0/16"
```

Create the cluster:

```bash
kind create cluster --config kind-calico.yaml --name calico-cluster
```

## Step 2: Verify the Cluster Is Running

After creation, confirm the cluster context is active and nodes are present:

```bash
kubectl cluster-info --context kind-calico-cluster
kubectl get nodes
```

Nodes will show as `NotReady` because no CNI is installed yet. This is expected.

## Step 3: Install Calico

Apply the official Calico manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Step 4: Wait for Calico Pods to Become Ready

Monitor the Calico system pods until they are all running:

```bash
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
```

## Step 5: Verify Nodes Are Ready

Once Calico is running, nodes should transition to the `Ready` state:

```bash
kubectl get nodes
```

## Step 6: Deploy a Test Application

Deploy a simple workload to confirm pod networking is functional:

```bash
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --type=ClusterIP
kubectl get pods -o wide
```

## Conclusion

You have successfully installed Calico on a Kind cluster by disabling the default CNI and applying the Calico manifest. Your cluster is now capable of enforcing Kubernetes network policies using Calico. This setup closely mirrors production Calico deployments, making Kind an effective local environment for testing CNI-dependent workloads.
