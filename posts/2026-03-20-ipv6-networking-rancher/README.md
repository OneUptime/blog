# How to Configure IPv6 Networking in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, IPv6, Networking, Kubernetes, Dual-Stack

Description: Guide to configuring IPv6 and dual-stack networking in Rancher Kubernetes clusters.

## Introduction

IPv6 and dual-stack networking are important capabilities for production Kubernetes clusters managed by Rancher. This guide provides practical configuration steps and examples for implementing this feature.

## Prerequisites

- Rancher v2.7.2+ cluster
- Cluster admin access
- A new Rancher-provisioned RKE2 cluster
- A CNI plugin that supports IPv6 or dual-stack networking
- Rancher Monitoring installed if you want to use the PrometheusRule example

## Architecture Overview

For Rancher-provisioned RKE2 clusters, IPv6 and dual-stack networking are configured when the cluster is created by setting the Cluster CIDR, Service CIDR, and Stack Preference. These settings rely on a compatible CNI plugin and cannot be enabled later on an existing IPv4-only cluster.

## Step 1: Verify Current Network Configuration

```bash
# Identify the deployed CNI
kubectl -n kube-system get pods -o wide | grep -E "calico|cilium|canal|flannel"

# View node addresses and pod CIDRs
kubectl describe nodes | grep -E "PodCIDR|PodCIDRs|InternalIP"

# View service IP families and assigned cluster IPs
kubectl get services --all-namespaces \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,IP_FAMILIES:.spec.ipFamilies,CLUSTER_IPS:.spec.clusterIPs'

# Check CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/*.conf 2>/dev/null
cat /etc/cni/net.d/*.conflist 2>/dev/null
```

## Step 2: Configure the Network Feature

In Rancher, set the Cluster CIDR, Service CIDR, and Stack Preference when you create the cluster. The following RKE2 configuration shows the equivalent dual-stack values:

```yaml
# Rancher UI: Stack Preference = dual
# /etc/rancher/rke2/config.yaml
cni: calico
cluster-cidr: "10.42.0.0/16,2001:cafe:42::/56"
service-cidr: "10.43.0.0/16,2001:cafe:43::/112"
```

For an IPv6-only cluster, use IPv6 CIDRs only and set the Rancher Stack Preference to `ipv6`.

## Step 3: Deploy a Test Workload

```yaml
# dual-stack-test-workload.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-service
  template:
    metadata:
      labels:
        app: web-service
    spec:
      containers:
      - name: web-service
        image: nginx
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: production
spec:
  ipFamilyPolicy: PreferDualStack
  selector:
    app: web-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

## Step 4: Test Network Configuration

```bash
# Create the test workload
kubectl apply -f dual-stack-test-workload.yaml

# Confirm the Service received the expected IP family configuration
kubectl get svc -n production web-service -o yaml | grep -E "ipFamilyPolicy|ipFamilies|clusterIPs"

# Launch a diagnostic pod
kubectl run net-test --image=nicolaka/netshoot --rm -it --restart=Never --command -- /bin/bash

# Inside the pod:
# dig A web-service.production.svc.cluster.local +short
# dig AAAA web-service.production.svc.cluster.local +short
# curl http://web-service.production.svc.cluster.local
```

## Step 5: Monitor Network Traffic

```bash
# View active sockets from a diagnostic pod
kubectl run net-observe --image=nicolaka/netshoot --rm -it --restart=Never --command -- ss -tunlp

# Inspect pod and service addressing
kubectl get pods -n production -o wide
kubectl get svc -n production web-service -o yaml | grep -E "ipFamilyPolicy|ipFamilies|clusterIPs"

# Check CNI component health
kubectl -n kube-system get pods -o wide | grep -E "calico|cilium|canal|flannel"
```

## Step 6: Configure Prometheus Metrics for Network

```yaml
# network-metrics-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: network-health
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: network.rules
    rules:
    - alert: NodeNetworkReceiveErrors
      expr: |
        increase(node_network_receive_errs_total[5m]) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Network receive errors detected on {{ $labels.instance }}"
    
    - alert: NodeNetworkTransmitErrors
      expr: |
        increase(node_network_transmit_errs_total[5m]) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Network transmit errors detected on {{ $labels.instance }}"
```

## Step 7: Troubleshooting Common Issues

```bash
# Debug network issues with netshoot
kubectl run netdebug --image=nicolaka/netshoot --rm -it --restart=Never --command -- /bin/bash

# Check DNS resolution
kubectl run dns-test --image=busybox --rm -it --restart=Never --command -- nslookup kubernetes.default.svc.cluster.local

# View recent RKE2 and kubelet logs on a node
journalctl -u rke2-server -u rke2-agent -u kubelet --since "1 hour ago" | grep -iE "cni|ipv6|calico|cilium|canal|flannel"

# Check CNI daemonsets and pods
kubectl -n kube-system get daemonset
kubectl -n kube-system get pods -o wide
```

## Conclusion

IPv6 networking in Rancher requires careful understanding of the underlying CNI plugin and cluster topology. Configure it when the cluster is created, test it thoroughly in a staging environment, and monitor the cluster so you can detect issues early.
