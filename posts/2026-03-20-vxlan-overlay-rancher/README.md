# How to Configure VXLAN Overlay in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, VXLAN, Overlay-network, Kubernetes, CNI

Description: Guide to configuring VXLAN overlay networking in Rancher for pod communication across nodes.

## Introduction

How to Configure VXLAN Overlay in Rancher is an important networking capability for production Kubernetes clusters managed by Rancher. This guide provides practical configuration steps and examples for implementing this feature.

## Prerequisites

- Rancher v2.7+ cluster
- Cluster admin access
- Understanding of Kubernetes networking fundamentals
- CNI plugin compatible with this feature

## Architecture Overview

Network configuration in Rancher-managed Kubernetes clusters leverages the CNI (Container Network Interface) plugin framework. Different networking features require different CNI configurations or additional plugins.

## Step 1: Verify Current Network Configuration

```bash
# Check current CNI plugin

kubectl get configmap -n kube-system kube-proxy -o yaml | grep mode

# Check network policies
kubectl get networkpolicies --all-namespaces

# View current pod networking
kubectl describe nodes | grep -E "PodCIDR|InternalIP"

# Check CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/10-*.conf 2>/dev/null || cat /etc/cni/net.d/10-*.conflist 2>/dev/null
```

## Step 2: Configure the Network Feature

```yaml
# network-feature-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: network-config
  namespace: kube-system
data:
  config.conf: |
    {
      "name": "custom-network",
      "cniVersion": "0.4.0",
      "plugins": [
        {
          "type": "main-cni-plugin",
          "ipam": {
            "type": "host-local",
            "ranges": [[{"subnet": "10.244.0.0/24"}]]
          }
        }
      ]
    }
```

## Step 3: Apply Network Policy

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: custom-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 5432    # Database
```

## Step 4: Test Network Configuration

```bash
# Test pod-to-pod connectivity
kubectl run net-test --image=nicolaka/netshoot --rm -it   --restart=Never -- /bin/bash

# Inside the pod:
# ping <target-pod-ip>
# curl http://<service-name>:<port>
# nslookup <service-name>

# Test with specific network features
kubectl exec -n production   $(kubectl get pods -n production -o name | head -1)   -- ip addr show
```

## Step 5: Monitor Network Traffic

```bash
# View network statistics
kubectl exec -n production   $(kubectl get pods -n production -o name | head -1)   -- netstat -tunap

# Check BGP/node status with calicoctl
kubectl exec -n kube-system   $(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1)   -- calicoctl node status
```

## Step 6: Configure Prometheus Metrics for Network

```yaml
# network-metrics-probe.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: network-health
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: network.rules
    rules:
    - alert: PodNetworkUnreachable
      expr: |
        up{job="network-probe"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Network probe failing for {{ $labels.instance }}"
    
    - alert: HighNetworkErrors
      expr: |
        rate(node_network_transmit_errs_total[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High network error rate on {{ $labels.device }}"
```

## Step 7: Troubleshooting Common Issues

```bash
# Debug network issues with netshoot
kubectl run netdebug   --image=nicolaka/netshoot   --rm -it   --restart=Never   -- /bin/bash

# Check DNS resolution
kubectl run dns-test   --image=busybox   --rm -it   --restart=Never   -- nslookup kubernetes.default.svc.cluster.local

# View CNI logs
journalctl -u kubelet --since "1 hour ago" | grep -i cni

# Check pod network namespace
kubectl exec -n kube-system   $(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1)   -- calicoctl node status 2>/dev/null || true
```

## Conclusion

VXLAN overlay configuration in Rancher requires careful understanding of the underlying CNI plugin and network topology. Test thoroughly in a staging environment before applying changes to production. Monitor network metrics and set up alerts to detect issues early.
