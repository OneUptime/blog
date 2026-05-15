# How to Set Up MicroShift for Lightweight Kubernetes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Kubernetes, Edge, Container

Description: Install and configure MicroShift on RHEL to run a lightweight, single-node Kubernetes cluster suitable for edge computing and resource-constrained environments.

---

MicroShift is a lightweight Kubernetes distribution from Red Hat designed for edge devices and small footprint environments. It runs on supported RHEL releases and provides core Kubernetes APIs with minimal resource usage.

## Prerequisites

You need RHEL with an active MicroShift subscription, at least 2 CPU cores, 2 GB of RAM, and 10 GB of storage. MicroShift uses CRI-O as the container runtime, which is installed as a dependency. Install an `oc` binary that matches your MicroShift version before running the verification commands.

## Enable Required Repositories

```bash
# Enable the MicroShift repository

sudo subscription-manager repos \
  --enable rhocp-4.21-for-rhel-9-$(uname -m)-rpms \
  --enable fast-datapath-for-rhel-9-$(uname -m)-rpms

# Verify repos are enabled
sudo dnf repolist | grep -E "rhocp|fast-datapath"
```

## Install MicroShift

```bash
# Install MicroShift and its dependencies
sudo dnf install -y microshift

# MicroShift will automatically pull in CRI-O as a dependency

# After downloading your Red Hat pull secret to $HOME/openshift-pull-secret,
# copy it for CRI-O
sudo cp $HOME/openshift-pull-secret /etc/crio/openshift-pull-secret
sudo chown root:root /etc/crio/openshift-pull-secret
sudo chmod 600 /etc/crio/openshift-pull-secret
```

## Configure Firewall Rules

```bash
# Open required ports for MicroShift
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=169.254.169.1
sudo firewall-cmd --permanent --zone=public --add-port=6443/tcp
sudo firewall-cmd --permanent --zone=public --add-port=30000-32767/tcp
sudo firewall-cmd --reload
```

## Start MicroShift

```bash
# Enable and start MicroShift
sudo systemctl enable --now microshift

# Wait for MicroShift to initialize (the first start can take several minutes)
sleep 120

# Copy the kubeconfig to your user
mkdir -p ~/.kube
sudo cat /var/lib/microshift/resources/kubeadmin/kubeconfig > ~/.kube/config
chmod go-r ~/.kube/config
```

## Verify the Cluster

```bash
# Check the nodes
oc get nodes

# Check all pods in the system namespaces
oc get pods -A

# Deploy a test application
oc create namespace test-app
oc run nginx --image=nginx --port=80 -n test-app
oc expose pod nginx --port=80 --type=NodePort -n test-app
oc get svc -n test-app
```

Resource Usage

MicroShift is designed to be lightweight. Check its resource footprint:

```bash
# Check memory usage
systemctl status microshift
ps aux | grep microshift
free -h
```

Actual idle usage varies by MicroShift version, enabled components, and workload, so size the host above the minimum requirements for the applications you plan to run.
