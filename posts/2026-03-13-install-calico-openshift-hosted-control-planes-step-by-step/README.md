# How to Install Calico on OpenShift Hosted Control Planes Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico on OpenShift Hosted Control Planes (HyperShift) worker nodes.

---

## Introduction

OpenShift Hosted Control Planes (HCP), powered by HyperShift, separates the Kubernetes control plane components from the worker nodes. The control plane runs as pods on a management cluster, while worker nodes form the data plane. This architecture changes how Calico is installed because the CNI plugin only needs to be deployed on the worker nodes - the hosted control plane itself uses the management cluster's networking.

Calico integrates with Hosted Control Planes by running on the worker node data plane while the Kubernetes API server (which Calico uses as its datastore) runs remotely in the management cluster. This is functionally the same as any remote datastore configuration, but requires specific kubeconfig configuration to reach the hosted cluster's API server.

This guide covers installing Calico on OpenShift Hosted Control Plane worker nodes.

## Prerequisites

- An OpenShift management cluster with HyperShift operator installed
- A Hosted Cluster created with `--network-type Other` and worker nodes provisioned
- `oc` CLI configured to access the hosted cluster
- The hosted cluster's kubeconfig available

## Step 1: Access the Hosted Cluster

```bash
# Get the hosted cluster kubeconfig

oc extract -n <hosted-cluster-namespace> \
  secret/<hosted-cluster-name>-admin-kubeconfig \
  --to=- > hosted-kubeconfig.yaml
export KUBECONFIG=hosted-kubeconfig.yaml

# Verify access
oc get nodes
```

## Step 2: Download the Calico OpenShift Manifests

```bash
mkdir calico
wget -qO- https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz | \
  tar xvz --strip-components=1 -C calico
```

## Step 3: Configure the Iptables Data Plane

```bash
sed -i 's/^\(\s*linuxDataplane:\s*\)BPF/\1Iptables/' calico/03-cr-installation.yaml
rm -f calico/cluster-network-operator.yaml
rm -f calico/01-configmap-kubernetes-services-endpoint.yaml
```

## Step 4: Create the Installation CR

Edit `calico/03-cr-installation.yaml` so the Installation CR includes your pod CIDR:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: Calico
  kubernetesProvider: OpenShift
  calicoNetwork:
    linuxDataplane: Iptables
    ipPools:
    - blockSize: 26
      cidr: 10.132.0.0/14
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

## Step 5: Apply the Calico Manifests

```bash
cd calico
ls 00* | xargs -n1 oc apply -f
ls 01* | xargs -n1 oc apply -f
ls 02* | xargs -n1 oc apply -f

timeout --foreground 600 bash -c "while ! oc get crd installations.operator.tigera.io; do sleep 5; done"
ls 03* | xargs -n1 oc apply -f
```

## Step 6: Monitor Calico Initialization

```bash
oc get tigerastatus -w
oc get pods -n calico-system -w
```

## Step 7: Verify Worker Nodes Are Ready

```bash
oc get nodes
oc get pods -A | grep calico
```

## Step 8: Verify Connectivity from a Test Pod

```bash
oc run test --image=curlimages/curl:8.7.1 -- sleep 300
oc get pod test -o wide
oc exec test -- curl -kfsS --connect-timeout 5 https://kubernetes.default.svc.cluster.local
oc delete pod test
```

## Conclusion

Installing Calico on OpenShift Hosted Control Planes requires targeting the hosted cluster's API server rather than the management cluster. The installation process follows the standard OpenShift HCP Calico workflow - OpenShift manifest bundle, data plane configuration, Installation CR - but uses the hosted cluster's kubeconfig. The Calico data plane runs entirely on the worker nodes, while the API server it communicates with runs as pods in the management cluster.
