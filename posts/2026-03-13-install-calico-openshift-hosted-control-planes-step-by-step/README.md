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
- A Hosted Cluster created and worker nodes provisioned
- `oc` CLI configured to access the hosted cluster
- `calicoctl` installed
- The hosted cluster's kubeconfig available

## Step 1: Access the Hosted Cluster

```bash
# Get the hosted cluster kubeconfig
oc extract secret/admin-kubeconfig -n <hosted-cluster-namespace> --to=- > hosted-kubeconfig.yaml
export KUBECONFIG=hosted-kubeconfig.yaml

# Verify access
kubectl get nodes
```

## Step 2: Install the Tigera Operator on the Hosted Cluster

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 3: Apply the Required SCCs

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml
```

## Step 4: Create the Installation CR

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: Calico
  kubernetesProvider: OpenShift
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.132.0.0/14
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
kubectl apply -f calico-installation.yaml
```

## Step 5: Monitor Calico Initialization

```bash
kubectl get tigerastatus -w
kubectl get pods -n calico-system -w
```

## Step 6: Verify Worker Nodes Are Ready

```bash
kubectl get nodes
kubectl get pods -A | grep calico
```

## Step 7: Verify Connectivity from a Test Pod

```bash
kubectl run test --image=busybox -- sleep 300
kubectl get pod test -o wide
kubectl exec test -- wget -qO- --timeout=5 http://kubernetes.default.svc.cluster.local
kubectl delete pod test
```

## Conclusion

Installing Calico on OpenShift Hosted Control Planes requires targeting the hosted cluster's API server rather than the management cluster. The installation process follows the standard OpenShift Calico workflow - Tigera Operator, SCCs, Installation CR - but uses the hosted cluster's kubeconfig. The Calico data plane runs entirely on the worker nodes, while the API server it communicates with runs as pods in the management cluster.
