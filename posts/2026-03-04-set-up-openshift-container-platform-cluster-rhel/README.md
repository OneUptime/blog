# How to Set Up an OpenShift Container Platform Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OpenShift, Kubernetes, Containers, Enterprise

Description: Deploy an OpenShift Container Platform cluster on RHEL infrastructure using the installer-provisioned infrastructure method.

---

OpenShift Container Platform (OCP) is Red Hat's enterprise Kubernetes distribution. It adds developer tools, an integrated container registry, CI/CD pipelines, and centralized management on top of Kubernetes. Here is an overview of deploying it on RHEL infrastructure.

## Prerequisites

You need:
- A Red Hat account with an OpenShift subscription
- A pull secret from console.redhat.com
- DNS configured for the cluster (api.cluster.example.com, *.apps.cluster.example.com)
- A bastion/installer host running RHEL

```bash
# On the bastion host: Download the OpenShift installer and CLI
curl -O https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-install-linux.tar.gz
curl -O https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz

# Extract the tools
tar xzf openshift-install-linux.tar.gz
tar xzf openshift-client-linux.tar.gz
sudo mv openshift-install oc kubectl /usr/local/bin/

# Verify
openshift-install version
oc version
```

## Creating the Install Configuration

```bash
# Create an installation directory
mkdir ~/ocp-install && cd ~/ocp-install

# Generate the install-config.yaml
openshift-install create install-config --dir=.

# The wizard will prompt for:
# - SSH public key
# - Platform (AWS, vSphere, bare metal, etc.)
# - Pull secret
# - Base domain
# - Cluster name
```

For a bare-metal deployment, edit the generated install-config.yaml:

```yaml
# install-config.yaml (example for bare metal)
apiVersion: v1
baseDomain: example.com
metadata:
  name: ocp-cluster
compute:
  - name: worker
    replicas: 3
controlPlane:
  name: master
  replicas: 3
platform:
  none: {}
pullSecret: '<your-pull-secret>'
sshKey: '<your-ssh-public-key>'
```

## Generating Manifests and Ignition Configs

```bash
# Back up the install-config.yaml (it gets consumed during manifest generation)
cp install-config.yaml install-config.yaml.bak

# Generate Kubernetes manifests
openshift-install create manifests --dir=.

# Generate Ignition configs for the nodes
openshift-install create ignition-configs --dir=.

# This creates:
# bootstrap.ign - for the temporary bootstrap node
# master.ign - for control plane nodes
# worker.ign - for worker nodes
```

## Booting the Nodes

Boot the control plane and worker nodes using RHCOS (Red Hat CoreOS) with the Ignition configs:

```bash
# Serve the Ignition configs via HTTP from the bastion
python3 -m http.server 8080 --directory ~/ocp-install &

# Boot each node with RHCOS ISO and point to the Ignition config
# On the RHCOS boot prompt, add kernel parameters:
# coreos.inst.install_dev=/dev/sda
# coreos.inst.ignition_url=http://bastion:8080/master.ign
```

## Monitoring the Installation

```bash
# Wait for the bootstrap to complete
openshift-install wait-for bootstrap-complete --dir=. --log-level=info

# After bootstrap completes, remove the bootstrap node from the load balancer

# Wait for the full installation to finish
openshift-install wait-for install-complete --dir=. --log-level=info
```

## Post-Installation Verification

```bash
# Set up kubeconfig
export KUBECONFIG=~/ocp-install/auth/kubeconfig

# Check cluster operators
oc get clusteroperators

# Check all nodes
oc get nodes

# Verify the cluster version
oc get clusterversion

# Access the web console
oc whoami --show-console
```

## Approving Worker CSRs

Worker nodes may need their CSRs approved:

```bash
# List pending CSRs
oc get csr | grep Pending

# Approve all pending CSRs
oc get csr -o name | xargs oc adm certificate approve
```

The full installation process typically takes 30-60 minutes. After completion, you have a production-ready OpenShift cluster with the full platform capabilities.
