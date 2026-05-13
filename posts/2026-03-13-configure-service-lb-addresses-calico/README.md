# How to Configure Service Load Balancer Addresses with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, LoadBalancer, IPAM, Networking

Description: Configure Calico to assign LoadBalancer IP addresses to Kubernetes services from managed IP pools without a cloud load balancer.

---

## Introduction

Service Load Balancer Addresses with Calico enables important networking capabilities in Calico Kubernetes clusters. Proper configuration ensures reliable service connectivity and IP address management.

## Prerequisites

- Calico v3.21+ installed
- kubectl and calicoctl access
- Cluster-admin access

## Configuration

```bash
calicoctl get ippools -o yaml
calicoctl get bgpconfiguration -o yaml
kubectl get kubecontrollersconfiguration default -o yaml
```

## Example Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: loadbalancer-ip-pool
spec:
  cidr: 10.48.0.0/16
  natOutgoing: true
  disabled: false
  assignmentMode: Automatic
  allowedUses:
    - LoadBalancer
---
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  serviceLoadBalancerIPs:
    - cidr: 10.48.0.0/16
```

## Verify

```bash
kubectl get svc -A
calicoctl get ippool loadbalancer-ip-pool -o yaml
```

## Architecture

```mermaid
graph LR
    POOL[LoadBalancer IP Pool] --> LBIP[LoadBalancer IP]
    LBIP --> SERVICE[Kubernetes Service]
    SERVICE --> POD[Pod]
```

## Conclusion

How to Configure Service Load Balancer Addresses with Calico in Calico provides reliable IP addressing for Kubernetes services and workloads. Follow the configuration and verification steps to ensure correct behavior.
