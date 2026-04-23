# How to Use CAPI with vSphere Provider via Rancher Turtles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Turtles, CAPI, vSphere, Kubernetes, VMware

Description: Provision Kubernetes clusters on VMware vSphere using the Cluster API vSphere provider with Rancher Turtles integration.

## Introduction

How to Use CAPI with vSphere Provider via Rancher Turtles is an important aspect of managing Kubernetes clusters with Rancher Turtles and Cluster API. This guide provides a comprehensive walkthrough with practical examples and best practices.

## Prerequisites

- Rancher Manager with Rancher Turtles installed and `kubectl` access to the management cluster
- CAPV, CAPRKE2, and CAAPF installed via `CAPIProvider`
- A vSphere credentials `Secret` and `VSphereClusterIdentity`
- A vSphere VM template prepared for RKE2 nodes
- vSphere inventory details for the datacenter, datastore, network, folder, resource pool, TLS thumbprint, and control plane VIP

## Overview

Rancher Turtles integrates Cluster API (CAPI) with Rancher to provide a unified, declarative approach to Kubernetes cluster lifecycle management. This guide walks through the specifics of How to Use CAPI with vSphere Provider via Rancher Turtles.

## Step 1: Prepare Your Environment

```bash
# Verify Rancher Turtles is running

kubectl get pods -n cattle-turtles-system

# Check installed Rancher Turtles CAPI providers
kubectl get capiproviders -A

# Verify the vSphere identity and available ClusterClasses
kubectl get vsphereclusteridentities.infrastructure.cluster.x-k8s.io
kubectl get clusterclasses -A

# Verify management cluster connectivity
kubectl cluster-info
```

## Step 2: Configure Resources

```bash
# Apply the official vSphere RKE2 ClusterClass and downstream add-on packages
kubectl apply -n default -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/clusterclasses/vsphere/rke2/clusterclass-rke2-example.yaml
kubectl apply -n default -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/ccm/vsphere/helm-chart.yaml
kubectl apply -n default -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/cni/calico/helm-chart.yaml
kubectl apply -n default -f https://raw.githubusercontent.com/rancher/turtles/refs/tags/v0.26.0/examples/applications/csi/vsphere/bundle.yaml
```

```yaml
# Example CAPI configuration for How to Use CAPI with vSphere Provider via Rancher Turtles
apiVersion: fleet.cattle.io/v1alpha1
kind: Bundle
metadata:
  name: vsphere-csi-config
  namespace: default
spec:
  resources:
    - content: |-
        apiVersion: v1
        kind: Secret
        type: Opaque
        metadata:
          name: vsphere-config-secret
          namespace: vmware-system-csi
        stringData:
          csi-vsphere.conf: |+
            [Global]
            thumbprint = "<VSPHERE_THUMBPRINT>"

            [VirtualCenter "<VSPHERE_SERVER>"]
            user = "<VSPHERE_USER>"
            password = "<VSPHERE_PASSWORD>"
            datacenters = "<VSPHERE_DATACENTER>"

            [Network]
            public-network = "<VSPHERE_NETWORK>"

            [Labels]
            zone = ""
            region = ""
  targets:
    - clusterSelector:
        matchLabels:
          csi: vsphere
          cluster.x-k8s.io/cluster-name: "example-cluster"
---
apiVersion: fleet.cattle.io/v1alpha1
kind: Bundle
metadata:
  name: vsphere-cloud-credentials
  namespace: default
spec:
  resources:
    - content: |-
        apiVersion: v1
        kind: Secret
        type: Opaque
        metadata:
          name: vsphere-cloud-secret
          namespace: kube-system
        stringData:
          <VSPHERE_SERVER>.password: "<VSPHERE_PASSWORD>"
          <VSPHERE_SERVER>.username: "<VSPHERE_USER>"
  targets:
    - clusterSelector:
        matchLabels:
          cloud-provider: vsphere
          cluster.x-k8s.io/cluster-name: "example-cluster"
---
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata:
  name: example-cluster
  namespace: default
  labels:
    cluster-api.cattle.io/rancher-auto-import: "true"
    cni: calico
    cloud-provider: vsphere
    csi: vsphere
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - 192.168.0.0/16
  topology:
    classRef:
      name: vsphere-rke2-example
    version: v1.35.0+rke2r1
    controlPlane:
      replicas: 3
    workers:
      machineDeployments:
        - class: vsphere-rke2-example-worker
          name: md-0
          replicas: 2
    variables:
      - name: vSphereClusterIdentityName
        value: cluster-identity
      - name: vSphereTLSThumbprint
        value: <VSPHERE_THUMBPRINT>
      - name: vSphereDataCenter
        value: <VSPHERE_DATACENTER>
      - name: vSphereDataStore
        value: <VSPHERE_DATASTORE>
      - name: vSphereFolder
        value: <VSPHERE_FOLDER>
      - name: vSphereNetwork
        value: <VSPHERE_NETWORK>
      - name: vSphereResourcePool
        value: <VSPHERE_RESOURCE_POOL>
      - name: vSphereServer
        value: <VSPHERE_SERVER>
      - name: vSphereTemplate
        value: <VSPHERE_TEMPLATE>
      - name: controlPlaneIpAddr
        value: <CONTROL_PLANE_IP>
      - name: controlPlanePort
        value: 6443
      - name: sshKey
        value: <SSH_KEY>
      - name: kubeVIPInterface
        value: <KUBE_VIP_INTERFACE>
```

```bash
# Apply the configuration
kubectl apply -f cluster-config.yaml

# Monitor progress
kubectl get cluster example-cluster -n default --watch
```

## Step 3: Verify the Configuration

```bash
# Check cluster status
kubectl get clusters -A

# Describe the cluster for detailed status
kubectl describe cluster example-cluster -n default

# View all CAPI resources
kubectl get clusters,machines,machinedeployments -n default

# Check Rancher import status
kubectl get clusters.management.cattle.io \
  -l cluster-api.cattle.io/capi-cluster-owner=example-cluster \
  -l cluster-api.cattle.io/capi-cluster-owner-ns=default
```

## Step 4: Validate in Rancher UI

1. Navigate to **Cluster Management** in Rancher
2. Verify the cluster appears in the list
3. Check cluster health indicators
4. Review node status and resource utilization

## Common Operations

```bash
# Scale worker nodes in a topology-managed cluster
kubectl patch cluster example-cluster -n default --type json \
  --patch '[{"op":"replace","path":"/spec/topology/workers/machineDeployments/0/replicas","value":5}]'

# Get cluster kubeconfig
clusterctl get kubeconfig example-cluster --namespace default > cluster-kubeconfig.yaml

# Test connectivity
export KUBECONFIG=cluster-kubeconfig.yaml
kubectl get nodes

# Return to management cluster
unset KUBECONFIG
```

## Troubleshooting

```bash
# Check Turtles controller logs
kubectl logs -n cattle-turtles-system -l control-plane=controller-manager --follow

# Check CAPI and provider controller logs
kubectl logs -n cattle-capi-system -l control-plane=controller-manager --since=30m
kubectl logs -n capv-system -l control-plane=controller-manager --since=30m
kubectl logs -n rke2-bootstrap-system -l control-plane=controller-manager --since=30m
kubectl logs -n rke2-control-plane-system -l control-plane=controller-manager --since=30m

# Get events for a cluster
kubectl get events -n default --field-selector involvedObject.name=example-cluster --sort-by=.lastTimestamp
```

## Conclusion

How to Use CAPI with vSphere Provider via Rancher Turtles with Rancher Turtles enables a declarative, Kubernetes-native approach to infrastructure management. By leveraging the Cluster API ecosystem alongside Rancher's management capabilities, you get a powerful, unified platform for managing Kubernetes clusters at scale across any infrastructure.
