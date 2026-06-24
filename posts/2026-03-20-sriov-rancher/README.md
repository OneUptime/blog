# How to Configure SR-IOV in Rancher - Sriov

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Sriov, Networking, Kubernetes, High-Performance

Description: Guide to configuring SR-IOV network virtualization in Rancher for high-performance network workloads.

## Introduction

How to Configure SR-IOV in Rancher is an important networking capability for production Kubernetes clusters managed by Rancher. This guide provides practical configuration steps and examples for implementing SR-IOV as a secondary pod network.

## Prerequisites

- Rancher-managed RKE2 cluster with Multus enabled as the first CNI entry
- Cluster admin access
- Understanding of Kubernetes networking fundamentals
- A primary CNI plugin such as Canal, Calico, or Cilium alongside Multus
- SR-IOV-capable NICs, IOMMU enabled on the host, and compatible host drivers
- SR-IOV Network Operator installed from Rancher Apps or Helm
- Whereabouts IPAM enabled for the `SriovNetwork` example below, or another installed IPAM plugin configured in its place

## Architecture Overview

SR-IOV in Rancher-managed RKE2 clusters is configured through Multus, the SR-IOV CNI plugin, the SR-IOV device plugin, and the SR-IOV Network Operator. The primary CNI still provides the default pod network; SR-IOV is attached as an additional pod interface backed by virtual functions (VFs) from a physical NIC.

## Step 1: Verify Current Network Configuration

```bash
# On each SR-IOV node, confirm the NIC can expose virtual functions
NIC=ens1f0
cat /sys/class/net/${NIC}/device/sriov_totalvfs

# Check that Multus is deployed by RKE2
kubectl get daemonset -n kube-system rke2-multus-ds

# Check SR-IOV operator pods
kubectl get pods -n sriov-network-operator

# Check SR-IOV node labels
kubectl get nodes -L feature.node.kubernetes.io/network-sriov.capable

# Check discovered SR-IOV interfaces
kubectl get sriovnetworknodestates.sriovnetwork.openshift.io -n sriov-network-operator
```

## Step 2: Configure the Network Feature

```yaml
# sriov-network-config.yaml
apiVersion: sriovnetwork.openshift.io/v1
kind: SriovNetworkNodePolicy
metadata:
  name: policy-netdevice
  namespace: sriov-network-operator
spec:
  priority: 90
  nodeSelector:
    feature.node.kubernetes.io/network-sriov.capable: "true"
  resourceName: intelnics
  deviceType: netdevice
  numVfs: 4
  mtu: 1500
  nicSelector:
    pfNames:
    - ens1f0
---
apiVersion: sriovnetwork.openshift.io/v1
kind: SriovNetwork
metadata:
  name: sriov-net
  namespace: sriov-network-operator
spec:
  networkNamespace: production
  resourceName: intelnics
  vlan: 0
  ipam: |
    {
      "type": "whereabouts",
      "range": "10.56.217.0/24",
      "exclude": [
        "10.56.217.0/28"
      ],
      "routes": [{
        "dst": "0.0.0.0/0"
      }],
      "gateway": "10.56.217.1"
    }
```

## Step 3: Attach the SR-IOV Network to a Pod

```yaml
# sriov-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: sriov-test
  namespace: production
  annotations:
    k8s.v1.cni.cncf.io/networks: sriov-net
spec:
  containers:
  - name: netshoot
    image: nicolaka/netshoot
    command: ["sleep", "3600"]
    resources:
      requests:
        rancher.io/intelnics: "1"
      limits:
        rancher.io/intelnics: "1"
```

## Step 4: Test Network Configuration

```bash
# Apply SR-IOV policy and network
kubectl apply -f sriov-network-config.yaml

# Wait until the node policy is reflected in node allocatable resources
kubectl describe nodes | grep -A5 rancher.io/intelnics

# Create a pod with an SR-IOV secondary interface
kubectl apply -f sriov-test-pod.yaml
kubectl wait -n production --for=condition=Ready pod/sriov-test --timeout=2m

# Confirm Multus added the SR-IOV interface
kubectl exec -n production sriov-test -- ip addr show net1
kubectl exec -n production sriov-test -- ip -d link show net1

# Test connectivity on the SR-IOV network
kubectl exec -n production sriov-test -- ping -c 3 <target-sriov-ip>
```

## Step 5: Monitor Network Traffic

```bash
# View SR-IOV interface counters inside the pod
kubectl exec -n production sriov-test -- ip -s link show net1

# Check the generated NetworkAttachmentDefinition
kubectl get network-attachment-definitions.k8s.cni.cncf.io -n production sriov-net -o yaml

# Check SR-IOV node state and sync status
kubectl get sriovnetworknodestates.sriovnetwork.openshift.io -n sriov-network-operator -o yaml
```

## Step 6: Configure Prometheus Metrics for Network

```yaml
# sriov-network-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sriov-network-health
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring # Adjust to match your Prometheus ruleSelector.
spec:
  groups:
  - name: sriov-network.rules
    rules:
    - alert: SriovConfigDaemonUnavailable
      expr: |
        kube_daemonset_status_number_unavailable{namespace="sriov-network-operator",daemonset="sriov-network-config-daemon"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "SR-IOV config daemon unavailable"

    - alert: SriovNodeNetworkErrors
      expr: |
        rate(node_network_transmit_errs_total{device!="lo"}[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High network transmit error rate on {{ $labels.device }}"
```

## Step 7: Troubleshooting Common Issues

```bash
# Check operator status and logs
kubectl get pods -n sriov-network-operator
kubectl logs -n sriov-network-operator daemonset/sriov-network-config-daemon --tail=100

# Check whether your NIC is allowed by the operator hardware list
kubectl get configmap supported-nic-ids -n sriov-network-operator -o yaml

# Check pod scheduling and resource allocation failures
kubectl describe pod -n production sriov-test
kubectl get events -A --sort-by=.lastTimestamp | grep -i sriov

# On the node, confirm IOMMU and VF configuration
dmesg | grep -Ei "DMAR|IOMMU"
cat /sys/class/net/ens1f0/device/sriov_numvfs
cat /sys/class/net/ens1f0/device/sriov_totalvfs
```

## Conclusion

How to Configure SR-IOV in Rancher configuration in Rancher requires careful understanding of Multus, the SR-IOV operator, hardware capabilities, and network topology. Test thoroughly in a staging environment before applying changes to production. Monitor network metrics and set up alerts to detect issues early.
