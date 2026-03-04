# How to Set Up MicroShift for Lightweight Kubernetes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Kubernetes, Edge, Containers

Description: Install and configure MicroShift on RHEL to run a lightweight, single-node Kubernetes cluster suitable for edge computing and resource-constrained environments.

---

MicroShift is a lightweight Kubernetes distribution from Red Hat designed for edge devices and small footprint environments. It runs on RHEL and provides core Kubernetes APIs with minimal resource usage.

## Prerequisites

You need RHEL with a valid subscription and at least 2 CPU cores and 2 GB of RAM. MicroShift also requires CRI-O as the container runtime.

## Enable Required Repositories

```bash
# Enable the MicroShift repository
sudo subscription-manager repos \
  --enable rhocp-4.14-for-rhel-9-x86_64-rpms \
  --enable fast-datapath-for-rhel-9-x86_64-rpms

# Verify repos are enabled
sudo dnf repolist | grep -E "rhocp|fast-datapath"
```

## Install MicroShift

```bash
# Install MicroShift and its dependencies
sudo dnf install -y microshift openshift-clients

# MicroShift will automatically pull in CRI-O as a dependency
```

## Configure Firewall Rules

```bash
# Open required ports for MicroShift
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=169.254.169.1
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --permanent --add-port=30000-32767/tcp
sudo firewall-cmd --reload
```

## Start MicroShift

```bash
# Enable and start MicroShift
sudo systemctl enable --now microshift

# Wait for MicroShift to initialize (may take a minute)
sleep 30

# Copy the kubeconfig to your user
mkdir -p ~/.kube
sudo cp /var/lib/microshift/resources/kubeadmin/kubeconfig ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
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

## Resource Usage

MicroShift is designed to be lightweight. Check its resource footprint:

```bash
# Check memory usage
systemctl status microshift
ps aux | grep microshift
free -h
```

MicroShift typically uses around 500 MB of RAM at idle, making it suitable for edge devices and IoT gateways.
