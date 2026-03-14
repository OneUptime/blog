# How to Install Calico on Minikube Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, Minikube

Description: A complete step-by-step guide to installing the Calico CNI plugin on a Minikube cluster for local development and testing.

---

## Introduction

Minikube is a popular tool for running a single-node Kubernetes cluster locally. By default, Minikube uses its own CNI configuration, but it supports switching to Calico for developers who need network policy enforcement or want to mirror production networking setups. Installing Calico on Minikube enables realistic local testing of network-policy-dependent applications.

Calico provides full Kubernetes NetworkPolicy support as well as its own GlobalNetworkPolicy extension. On Minikube, Calico runs in the same manner as on production clusters, making it an excellent choice for validating CNI-dependent configurations locally. The installation uses the `--cni` flag introduced in newer versions of the Minikube CLI.

This guide covers both the Minikube CNI flag method and the manual manifest-based installation method, giving you flexibility based on your Minikube version and requirements.

## Prerequisites

- Minikube v1.25+ installed
- kubectl installed and configured
- Docker or a compatible VM driver for Minikube
- Internet access to pull Calico manifests

## Step 1: Start Minikube Without a CNI

Start Minikube with no CNI so you can install Calico manually:

```bash
minikube start --network-plugin=cni --cni=false
```

Alternatively, use the built-in Calico support:

```bash
minikube start --cni=calico
```

If using the built-in option, skip to Step 4.

## Step 2: Apply the Calico Manifest

For manual installation, apply the official Calico manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Step 3: Wait for Calico Pods to Start

Monitor Calico pod initialization:

```bash
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

## Step 4: Verify Node Is Ready

```bash
kubectl get nodes
```

The Minikube node should show `Ready` status once Calico is fully initialized.

## Step 5: Verify Calico Pods

```bash
kubectl get pods -n kube-system | grep calico
```

Expect to see `calico-node` and `calico-kube-controllers` pods in `Running` state.

## Step 6: Test Pod Networking

Deploy a test pod and verify it receives an IP from Calico's IPAM:

```bash
kubectl run test --image=busybox --restart=Never -- sleep 3600
kubectl get pod test -o wide
```

The pod IP should fall within the default Calico CIDR of `192.168.0.0/16`.

## Step 7: Enable the Minikube Tunnel (for LoadBalancer Services)

```bash
minikube tunnel
```

## Conclusion

You have installed Calico on Minikube either using the built-in `--cni=calico` flag or by manually applying the Calico manifest. Your Minikube cluster can now enforce Kubernetes NetworkPolicy resources, providing a realistic local environment for developing and testing network-policy-aware applications.
