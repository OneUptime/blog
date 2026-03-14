# How to Install Calico on OpenShift Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Installation

Description: A step-by-step guide to replacing OpenShift's default OVN-Kubernetes CNI with Calico on a self-managed OpenShift cluster.

---

## Introduction

OpenShift ships with OVN-Kubernetes as its default CNI plugin, but self-managed OpenShift clusters can be reconfigured to use Calico. The primary reason to choose Calico on OpenShift is access to Calico's advanced network policy capabilities — GlobalNetworkPolicy, host endpoint policies, and fine-grained egress rules — which go beyond what OpenShift's built-in network policy supports.

Installing Calico on OpenShift requires using the Tigera Operator with OpenShift-specific configuration. OpenShift's Security Context Constraints (SCCs) require that the Calico pods run with elevated privileges, and the cluster network operator must be informed of the CNI change.

This guide covers installing Calico on a self-managed OpenShift 4.x cluster.

## Prerequisites

- A self-managed OpenShift 4.x cluster
- `oc` CLI with cluster admin access
- `calicoctl` installed
- A maintenance window (CNI changes require cluster-wide pod restarts)

## Step 1: Disable the Default Network Operator

OpenShift's network operator manages OVN-Kubernetes. You need to put it into unmanaged mode before installing Calico.

```bash
oc patch network.operator cluster \
  --type merge \
  --patch '{"spec":{"managementState":"Unmanaged"}}'
```

## Step 2: Remove OVN-Kubernetes

```bash
oc delete network.config cluster
oc delete -n openshift-network-operator deployment network-operator
```

## Step 3: Install the Tigera Operator for OpenShift

OpenShift requires the OperatorHub-based installation or the OpenShift-specific operator manifest.

```bash
oc create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
oc rollout status deployment/tigera-operator -n tigera-operator
```

## Step 4: Create the Installation CR

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: Calico
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.128.0.0/14
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
  kubernetesProvider: OpenShift
```

```bash
oc apply -f calico-installation.yaml
```

## Step 5: Create Required SCCs

Calico pods need elevated privileges on OpenShift.

```bash
oc apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml
```

## Step 6: Verify Installation

```bash
oc get tigerastatus
oc get pods -n calico-system
oc get nodes
```

All nodes should reach `Ready` status once `calico-node` pods are running.

## Conclusion

Installing Calico on OpenShift requires disabling the default network operator, removing OVN-Kubernetes, installing the OpenShift-compatible Tigera Operator, creating the Installation CR with `kubernetesProvider: OpenShift`, and applying the required SCCs. These OpenShift-specific steps are in addition to the standard Calico installation workflow.
