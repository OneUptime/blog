# How to Install Calico on MicroK8s Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, MicroK8s

Description: A step-by-step guide to enabling and installing Calico as the CNI on a MicroK8s cluster.

---

## Introduction

MicroK8s is a lightweight, CNCF-certified Kubernetes distribution developed by Canonical. It ships with a built-in add-on system and includes Calico as the default CNI option. Using Calico on MicroK8s is simpler than on many other Kubernetes distributions because MicroK8s deploys and manages the default CNI configuration for you.

By default, MicroK8s uses Calico as its networking plugin, making it one of the easiest platforms to get Calico running. The Calico manifest included with MicroK8s is tied to the MicroK8s release you install, reducing compatibility concerns.

This guide covers installing MicroK8s with its default Calico CNI configuration as well as verifying the installation. It also covers installing `calicoctl` for cases where you need to inspect or manage Calico resources directly.

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

## Step 2: Confirm Calico Is Installed

```bash
microk8s status
```

MicroK8s installs and configures Calico automatically. There is no separate `calico` add-on to enable on current MicroK8s releases.

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
  -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/var/snap/microk8s/current/credentials/client.config
calicoctl version
```

## Conclusion

You have installed MicroK8s with its default Calico CNI configuration. MicroK8s simplifies Calico installation by handling the networking configuration automatically. Your MicroK8s cluster now enforces Kubernetes NetworkPolicy resources and is ready for Calico-specific policy configurations.
