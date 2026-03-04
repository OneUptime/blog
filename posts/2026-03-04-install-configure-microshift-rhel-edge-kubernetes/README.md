# How to Install and Configure MicroShift on RHEL for Edge Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Kubernetes, Edge Computing, OpenShift, Linux

Description: Install and configure MicroShift on RHEL to run a lightweight Kubernetes distribution optimized for edge computing and resource-constrained environments.

---

MicroShift is a lightweight Kubernetes distribution derived from OpenShift, designed for edge devices and resource-constrained environments. It runs on RHEL with minimal overhead while providing core Kubernetes and OpenShift APIs.

## Prerequisites

MicroShift requires RHEL 9.x with an active subscription:

```bash
# Verify RHEL version
cat /etc/redhat-release

# Enable required repositories
sudo subscription-manager repos \
  --enable rhocp-4.16-for-rhel-9-x86_64-rpms \
  --enable fast-datapath-for-rhel-9-x86_64-rpms
```

## Installing MicroShift

```bash
# Install MicroShift and its dependencies
sudo dnf install -y microshift openshift-clients

# MicroShift uses CRI-O as the container runtime
# It is installed as a dependency automatically
```

## Configuring the Firewall

Open the required ports:

```bash
# Allow Kubernetes API server
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=169.254.169.1

# Allow NodePort services
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --permanent --add-port=30000-32767/tcp

# Reload firewall
sudo firewall-cmd --reload
```

## Starting MicroShift

```bash
# Enable and start MicroShift
sudo systemctl enable --now microshift

# Check the service status
sudo systemctl status microshift
```

## Configuring kubectl Access

```bash
# Copy the kubeconfig for your user
mkdir -p ~/.kube
sudo cp /var/lib/microshift/resources/kubeadmin/kubeconfig ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify connectivity
oc get nodes
kubectl get pods -A
```

## Verifying the Installation

```bash
# Check that all system pods are running
kubectl get pods -n openshift-dns
kubectl get pods -n openshift-ingress
kubectl get pods -n openshift-service-ca

# Check node status
oc get nodes -o wide
```

## Deploying a Test Application

```bash
# Create a test namespace
kubectl create namespace test-app

# Deploy a simple web application
kubectl -n test-app create deployment hello \
  --image=registry.access.redhat.com/ubi9/httpd-24:latest

# Expose it as a service
kubectl -n test-app expose deployment hello --port=8080 --type=NodePort

# Get the NodePort
kubectl -n test-app get svc hello
```

## MicroShift Configuration

Customize MicroShift settings:

```yaml
# /etc/microshift/config.yaml
dns:
  baseDomain: microshift.example.com
network:
  clusterNetwork:
    - cidr: 10.42.0.0/16
  serviceNetwork:
    - 10.43.0.0/16
node:
  hostnameOverride: edge-node-01
```

Restart MicroShift after changing the configuration:

```bash
sudo systemctl restart microshift
```
