# How to Set Up MicroShift for Lightweight Kubernetes on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, MicroShift, Kubernetes

Description: Step-by-step guide on set up microshift for lightweight kubernetes on rhel 9 with practical examples and commands.

---

MicroShift brings lightweight Kubernetes to edge and resource-constrained environments running RHEL 9. This guide covers installation and initial configuration.

## Prerequisites

- RHEL 9 system with at least 2 CPU cores and 2 GB RAM
- Active Red Hat subscription
- 10 GB free disk space for MicroShift and container images

## Enable Required Repositories

```bash
sudo subscription-manager repos \
  --enable rhocp-4.14-for-rhel-9-x86_64-rpms \
  --enable fast-datapath-for-rhel-9-x86_64-rpms
```

## Install MicroShift

```bash
sudo dnf install -y microshift openshift-clients
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=169.254.169.1
sudo firewall-cmd --permanent --zone=public --add-port=6443/tcp
sudo firewall-cmd --permanent --zone=public --add-port=80/tcp
sudo firewall-cmd --permanent --zone=public --add-port=443/tcp
sudo firewall-cmd --reload
```

## Start MicroShift

```bash
sudo systemctl enable --now microshift
```

## Configure kubectl Access

```bash
mkdir -p ~/.kube
sudo cp /var/lib/microshift/resources/kubeadmin/kubeconfig ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

## Verify the Cluster

```bash
oc get nodes
oc get pods -A
```

You should see the MicroShift node in Ready state and system pods running.

## Deploy a Test Application

```bash
oc create namespace test-app
oc -n test-app create deployment hello --image=registry.access.redhat.com/ubi9/httpd-24
oc -n test-app expose deployment hello --port=8080
oc -n test-app get pods
```

## Configure MicroShift Settings

Edit the MicroShift configuration:

```bash
sudo mkdir -p /etc/microshift
sudo tee /etc/microshift/config.yaml > /dev/null <<EOF
dns:
  baseDomain: microshift.example.com
network:
  clusterNetwork:
    - cidr: 10.42.0.0/16
  serviceNetwork:
    - 10.43.0.0/16
EOF

sudo systemctl restart microshift
```

## Storage Configuration

MicroShift includes a built-in CSI driver for local volumes:

```bash
oc get storageclass
```

## Conclusion

MicroShift provides a minimal Kubernetes environment on RHEL 9 suitable for edge computing, IoT gateways, and resource-constrained environments. It runs with a fraction of the resources required by full OpenShift while maintaining API compatibility.

