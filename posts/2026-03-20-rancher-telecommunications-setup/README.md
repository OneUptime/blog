# How to Set Up Rancher for Telecommunications - Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Telecommunications, 5G, Edge, Kubernetes, NFV

Description: A guide to setting up Rancher for telecommunications environments, covering edge cluster management, NFV workloads, 5G core, and high-availability configurations.

## Overview

Telecommunications companies are deploying Kubernetes to power 5G core networks, network function virtualization (NFV), multi-access edge computing (MEC), and OSS/BSS modernization. Rancher is well-suited for telco environments due to its multi-cluster management, edge support with K3s, and support for high-performance networking with DPDK and SR-IOV. This guide covers key configurations for telco deployments.

## Prerequisites

- Bare metal servers with SR-IOV capable NICs (for DPDK workloads)
- CPU pinning and hugepages configured at OS level
- RKE2 or K3s clusters depending on location (core vs edge)
- NUMA topology awareness enabled
- Rancher Fleet for edge cluster management

## Step 1: Configure Worker Nodes for Telco Workloads

Telco workloads require CPU pinning and hugepages:

```bash
# Configure 1GB hugepages on worker nodes at boot

# Add to kernel boot parameters (GRUB)
# /etc/default/grub
GRUB_CMDLINE_LINUX="default_hugepagesz=1G hugepagesz=1G hugepages=16 \
  iommu=on intel_iommu=on isolcpus=2-15 nohz_full=2-15 rcu_nocbs=2-15"

update-grub && reboot
```

## Step 2: Install Multus CNI for Multi-Network

Telco workloads often require multiple network interfaces:

```yaml
# /etc/rancher/rke2/config.yaml
cni:
  - multus
  - calico  # Multus as meta-CNI with Calico as primary
```

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-multus-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-multus
  namespace: kube-system
spec:
  valuesContent: |-
    rke2-whereabouts:
      enabled: true
```

```yaml
# NetworkAttachmentDefinition for SR-IOV network
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: sriov-net
  namespace: telco-core
  annotations:
    k8s.v1.cni.cncf.io/resourceName: openshift.io/intel_sriov_netdevice
spec:
  config: '{
    "type": "sriov",
    "cniVersion": "0.3.1",
    "name": "sriov-net",
    "ipam": {
      "type": "whereabouts",
      "range": "10.56.217.0/24"
    }
  }'
```

## Step 3: Deploy SR-IOV Network Operator

```bash
# Install SR-IOV Network Operator
helm install sriov-network-operator \
  oci://ghcr.io/k8snetworkplumbingwg/sriov-network-operator-chart \
  --namespace sriov-network-operator \
  --create-namespace \
  --set sriovOperatorConfig.deploy=true
```

```yaml
# SriovNetworkNodePolicy for network function pods
apiVersion: sriovnetwork.openshift.io/v1
kind: SriovNetworkNodePolicy
metadata:
  name: policy-ens3f0
  namespace: sriov-network-operator
spec:
  resourceName: intel_sriov_netdevice
  nodeSelector:
    feature.node.kubernetes.io/network-sriov.capable: "true"
  numVfs: 8
  nicSelector:
    pfNames: ["ens3f0"]
  deviceType: netdevice
```

## Step 4: CPU Manager for Dedicated CPU Pinning

```yaml
# Kubelet configuration for CPU Manager
# /etc/rancher/rke2/config.yaml
kubelet-arg:
  - "cpu-manager-policy=static"
  - "kube-reserved=cpu=2,memory=4Gi"
  - "system-reserved=cpu=1,memory=2Gi"
  - "topology-manager-policy=single-numa-node"
```

```yaml
# Network function pod requesting exclusive CPUs
apiVersion: v1
kind: Pod
metadata:
  name: upf-pod    # User Plane Function (5G core)
spec:
  containers:
    - name: upf
      image: registry.telco.com/5g/upf:v1.0.0
      resources:
        requests:
          cpu: "4"                      # 4 dedicated CPUs
          memory: "8Gi"
          hugepages-1Gi: "4Gi"          # 4GB hugepages
          openshift.io/intel_sriov_netdevice: "2"  # SR-IOV interfaces
        limits:
          cpu: "4"
          memory: "8Gi"
          hugepages-1Gi: "4Gi"
          openshift.io/intel_sriov_netdevice: "2"
```

## Step 5: Edge Cluster Management with Fleet

Telecommunications companies deploy many edge sites. Use Fleet for centralized management:

```yaml
# Fleet GitRepo targeting all edge clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: edge-5g-config
  namespace: fleet-default
spec:
  repo: https://git.telco.internal/edge-configs
  branch: main
  targets:
    - name: edge-sites
      clusterSelector:
        matchLabels:
          site-type: edge
          region: europe
  paths:
    - base/
    - edge/
```

## Step 6: High Availability for Core Network Functions

```yaml
# PodDisruptionBudget for critical 5G core functions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: smf-pdb    # Session Management Function
  namespace: 5g-core
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: smf
---
# Topology spread for multi-AZ deployments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: amf         # Access and Mobility Management Function
  namespace: 5g-core
spec:
  replicas: 3
  selector:
    matchLabels:
      app: amf
  template:
    metadata:
      labels:
        app: amf
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: amf
```

## Step 7: Monitoring Telco KPIs

Deploy Rancher Monitoring with telco-specific dashboards:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-monitoring-crd rancher-charts/rancher-monitoring-crd \
  --namespace cattle-monitoring-system \
  --create-namespace

helm install rancher-monitoring rancher-charts/rancher-monitoring \
  --namespace cattle-monitoring-system \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.retentionSize=50GB
```

```yaml
# PrometheusRule for 5G core SLA monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: 5g-sla-rules
  namespace: 5g-core
spec:
  groups:
    - name: 5g-latency
      rules:
        - alert: HighControlPlaneLatency
          expr: amf_request_duration_p99 > 0.010  # 10ms P99 latency SLA
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "5G AMF latency exceeds 10ms SLA"
```

## Step 8: K3s for Edge and MEC Sites

For edge and MEC (Multi-Access Edge Computing) sites with constrained resources:

```bash
# Install K3s at edge site
curl -sfL https://get.k3s.io | sh -s - \
  --node-label="site-type=edge" \
  --node-label="region=europe" \
  --disable=traefik      # Disable default ingress for telco use

# Register with Rancher for centralized management
# Apply the Rancher cluster-agent manifest generated from Rancher UI
```

## Conclusion

Rancher provides a strong foundation for telecommunications Kubernetes deployments with its multi-cluster management via Fleet, edge computing support via K3s, and support for telco-specific requirements like SR-IOV, CPU pinning, and hugepages. The combination of RKE2 for core sites and K3s for edge locations, managed centrally by Rancher and Fleet, provides a scalable telco cloud platform. Ensure you work closely with your network engineering team to validate SR-IOV configurations and CPU topology for each network function's performance requirements.
