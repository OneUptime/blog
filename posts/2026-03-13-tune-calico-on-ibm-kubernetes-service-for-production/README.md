# How to Tune Calico on IBM Kubernetes Service for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, IBM Kubernetes Service

Description: Apply production-grade Calico tuning on IBM Kubernetes Service for optimal performance and security.

---

## Introduction

IBM Kubernetes Service includes Calico as its CNI and network policy solution. Unlike self-managed Calico clusters, IKS manages the Calico plug-in and its default components for you, so production tuning should use IBM-supported settings such as MTU changes, CNI portmap configuration, monitoring, and Calico network policies.

IKS clusters often run in IBM Cloud data centers with high-speed networking, making MTU validation important. IBM Cloud supports Calico MTU changes for Kubernetes 1.29 and later clusters. Avoid directly modifying Calico daemon sets, deployments, default IPPools, or Calico nodes unless IBM Support directs you to do so.

## Prerequisites

- IKS cluster in production
- calicoctl configured for IKS
- kubectl with cluster-admin access
- IBM Cloud CLI
- IBM Cloud Monitoring agent, if you want cluster metrics in IBM Cloud Monitoring

## Step 1: Check IKS Worker Node Network Configuration

```bash
ibmcloud ks worker ls --cluster my-iks-cluster
kubectl get nodes -o wide
```

Identify whether the cluster is classic or VPC, and note whether the workers use virtual server or bare-metal flavors. For MTU planning, also identify the private network interface names on the worker nodes.

## Step 2: Review Calico Configuration for IKS

Configure `calicoctl` to use the Kubernetes datastore and review the current Calico objects:

```bash
ibmcloud ks cluster config --cluster my-iks-cluster
export DATASTORE_TYPE=kubernetes
calicoctl get nodes
calicoctl get ippools -o yaml
```

Do not patch the default IPPool on IKS. IBM does not support modifying default Calico IPPool resources or other default Calico settings directly.

## Step 3: Configure Supported MTU Tuning

For Kubernetes 1.29 and later clusters, IBM supports changing Calico MTU through the Tigera operator Installation resource. Test the node MTU first from a worker node debug shell:

```bash
kubectl debug --image=us.icr.io/armada-master/network-alpine -it node/<NODE_NAME> -- sh
ping -c1 -Mdo -s 8972 <OTHER_NODE_PRIVATE_IP>
```

If your worker nodes and network path support jumbo frames, update the host MTU first, then set the Calico MTU. For non-Satellite clusters, set Calico MTU 20 bytes lower than the node MTU:

```bash
kubectl patch installation.operator.tigera.io default \
  --type='merge' \
  -p '{"spec":{"calicoNetwork":{"mtu":8980}}}'
```

Apply the change during a maintenance window and roll workers one at a time, following the same drain and reboot process you use for production worker maintenance.

## Step 4: Configure Typha for Large IKS Clusters

Typha reduces Kubernetes API server load for large Calico clusters. On IKS 1.29 and later, Calico runs in `calico-system`; on 1.28 and earlier, it runs in `kube-system`.

```bash
kubectl get pods -A | grep calico-typha
```

In Kubernetes 1.29 and later clusters, the Calico operator determines the number of `calico-typha` pods based on the number of workers. Do not patch the `calico-typha` deployment directly. For high availability, make sure enough untainted workers exist so at least two Typha pods can run.

## Step 5: Review Calico Resource Requests

```bash
kubectl get daemonset calico-node -n calico-system -o yaml 2>/dev/null || \
  kubectl get daemonset calico-node -n kube-system -o yaml
kubectl top pods -A | grep calico
```

Do not patch Calico component daemon sets or deployments on IKS. If Calico resource usage is consistently constrained, open an IBM Support case with the cluster ID, Calico pod metrics, node metrics, and workload impact.

## Step 6: Enable IBM Cloud Monitoring Integration

Use the IBM Cloud Monitoring agent to collect Kubernetes and host metrics. After you install the agent, verify that it is running:

```bash
kubectl get pods -n ibm-observe
```

For Calico-specific troubleshooting, collect Calico pod status and logs from the namespace used by your cluster version:

```bash
kubectl get pods -A | grep calico
kubectl logs -n calico-system <calico-node-pod> 2>/dev/null || \
  kubectl logs -n kube-system <calico-node-pod>
```

## Step 7: Configure BGP for IKS Multi-Zone Deployments

For multi-zone IKS clusters, review BGP configuration only when your cluster's Calico deployment uses BGP:

```bash
calicoctl get bgpconfiguration default -o yaml
calicoctl get bgppeer -o yaml
```

Verify that BGP sessions are established between all zones:

```bash
calicoctl node status
```

Do not create or patch BGP peers on IKS unless you have confirmed the design with IBM Support.

## Step 8: Verify Production Settings

```bash
kubectl get pods -A | grep calico
kubectl get installation.operator.tigera.io default -o yaml
calicoctl get ippool -o yaml
calicoctl get globalnetworkpolicy -o wide
```

## Conclusion

You have applied production-grade, IBM-supported Calico tuning on IKS: validating worker networking, reviewing Calico state, changing MTU through the supported operator path when needed, confirming operator-managed Typha health, and enabling monitoring integration. IKS's managed Calico integration gives you useful network policy and operational controls, but default Calico components and IPPools should remain managed by IBM.
