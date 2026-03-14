# How to Install Calico on MicroK8s Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, MicroK8s

Description: A step-by-step guide to enabling and installing Calico as the CNI on a MicroK8s cluster.

---

## Introduction

MicroK8s is a lightweight, CNCF-certified Kubernetes distribution developed by Canonical. It ships with a built-in add-on system that includes Calico as a supported CNI option. Enabling Calico on MicroK8s is simpler than on many other Kubernetes distributions because MicroK8s manages the CNI lifecycle through its add-on framework.

By default, MicroK8s uses Calico as its networking plugin when the `calico` add-on is enabled, making it one of the easiest platforms to get Calico running. The MicroK8s Calico add-on installs a version of Calico that is tested and validated against the specific MicroK8s Kubernetes version, reducing compatibility concerns.

This guide covers enabling Calico on MicroK8s using the add-on system as well as verifying the installation. It also covers the manual installation approach for cases where you need a specific Calico version.

## Prerequisites

- MicroK8s installed (v1.27+)
- sudo or root access on the host
- Internet access for downloading Calico images

## Step 1: Install MicroK8s

If not already installed:

```bash
sudo snap install microk8s --classic --channel=1.28/stable
sudo usermod -aG microk8s $USER
newgrp microk8s
```

## Step 2: Enable the Calico Add-On

```bash
microk8s enable calico
```

MicroK8s will download and configure Calico automatically. Wait for the add-on to complete.

## Step 3: Verify MicroK8s Is Ready

```bash
microk8s status --wait-ready
```

## Step 4: Check Calico Pods

```bash
microk8s kubectl get pods -n kube-system | grep calico
```

Expect to see `calico-node` and `calico-kube-controllers` in `Running` state.

## Step 5: Verify Node Is Ready

```bash
microk8s kubectl get nodes
```

## Step 6: Test Networking with a Sample Pod

```bash
microk8s kubectl run test --image=busybox --restart=Never -- sleep 3600
microk8s kubectl get pod test -o wide
```

The pod should receive an IP from Calico's default CIDR `10.1.0.0/16` (MicroK8s default).

## Step 7: Configure kubectl Alias (Optional)

```bash
echo "alias kubectl='microk8s kubectl'" >> ~/.bashrc
source ~/.bashrc
```

## Step 8: Install calicoctl for MicroK8s

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/var/snap/microk8s/current/credentials/client.config
calicoctl version
```

## Conclusion

You have installed Calico on MicroK8s using the built-in add-on system. MicroK8s simplifies Calico installation by handling the networking configuration automatically. Your MicroK8s cluster now enforces Kubernetes NetworkPolicy resources and is ready for Calico-specific policy configurations.
