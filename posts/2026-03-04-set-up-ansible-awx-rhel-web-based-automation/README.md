# How to Set Up Ansible AWX on RHEL for Web-Based Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, AWX, Automation, Web UI, Kubernetes, Linux

Description: Set up Ansible AWX on RHEL to get a web-based interface for managing Ansible playbooks, inventories, and job scheduling.

---

AWX is the open-source upstream project for Red Hat Ansible Automation Platform. It provides a web UI, REST API, and task engine for Ansible. On RHEL, you deploy AWX using the AWX Operator on a Kubernetes cluster such as Minikube or a single-node K3s setup.

## Prerequisites

Install the required tools:

```bash
# Install K3s as a lightweight Kubernetes distribution
curl -sfL https://get.k3s.io | sh -

# Verify K3s is running
sudo k3s kubectl get nodes

# Set up kubeconfig for your user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config
```

## Installing the AWX Operator

Deploy the AWX Operator using Kustomize:

```bash
# Create a kustomization directory
mkdir -p ~/awx-deploy && cd ~/awx-deploy

# Create kustomization.yaml
cat > kustomization.yaml << 'KUST'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - github.com/ansible/awx-operator/config/default?ref=2.19.0
images:
  - name: quay.io/ansible/awx-operator
    newTag: 2.19.0
namespace: awx
KUST

# Create the namespace and apply
kubectl create namespace awx
kubectl apply -k .
```

Wait for the operator pod to be ready:

```bash
# Watch the operator pod status
kubectl -n awx get pods -w
```

## Deploying an AWX Instance

Create the AWX custom resource:

```bash
# Create the AWX instance manifest
cat > awx-instance.yaml << 'AWX'
apiVersion: awx.ansible.com/v1beta1
kind: AWX
metadata:
  name: awx
  namespace: awx
spec:
  service_type: NodePort
  nodeport_port: 30080
AWX

# Add it to kustomization and apply
cat >> kustomization.yaml << 'APPEND'
  - awx-instance.yaml
APPEND

kubectl apply -k .
```

## Accessing the AWX Web UI

Retrieve the admin password and access the interface:

```bash
# Get the admin password from the Kubernetes secret
kubectl -n awx get secret awx-admin-password -o jsonpath='{.data.password}' | base64 --decode; echo

# Check the service endpoint
kubectl -n awx get svc awx-service
```

Open your browser and navigate to `http://<your-rhel-ip>:30080`. Log in with username `admin` and the password you retrieved. From the web UI, you can create inventories, add credentials, import playbooks from Git repositories, and schedule automated jobs.
