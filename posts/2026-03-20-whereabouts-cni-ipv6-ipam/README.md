# How to Configure Whereabouts CNI for IPv6 IPAM in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Whereabouts, CNI, IPv6, Kubernetes, IPAM, IP Address Management, Multus

Description: Configure Whereabouts IPAM CNI plugin to manage IPv6 address allocation across Kubernetes nodes for secondary network interfaces attached via Multus.

## Introduction

Whereabouts is a CNI IPAM plugin that assigns unique IP addresses (IPv4 or IPv6) from a pool across all nodes in a cluster, preventing address conflicts. It is commonly used with Multus CNI for secondary network IPv6 address management.

## Installation

```bash
# Install Whereabouts

kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/daemonset-install.yaml

# Verify
kubectl get pods -n kube-system | grep whereabouts
```

## Step 1: Configure Whereabouts for IPv6

```yaml
# whereabouts-nad.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipv6-secondary-net
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "ipv6-secondary-net",
      "type": "macvlan",
      "master": "eth1",
      "mode": "bridge",
      "ipam": {
        "type": "whereabouts",
        "datastore": "kubernetes",
        "kubernetes": {
          "kubeconfig": "/etc/cni/net.d/whereabouts.d/whereabouts.kubeconfig"
        },
        "range": "2001:db8:secondary::/64",
        "gateway": "2001:db8:secondary::1",
        "routes": [
          { "dst": "::/0", "gw": "2001:db8:secondary::1" }
        ],
        "exclude": [
          "2001:db8:secondary::1/128",
          "2001:db8:secondary::ffff:ffff:ffff:ffff/128"
        ]
      }
    }
```

## Step 2: IPPool CRD for IPv6

```yaml
# whereabouts-ippool.yaml
apiVersion: whereabouts.cni.cncf.io/v1alpha1
kind: IPPool
metadata:
  name: ipv6-secondary-pool
  namespace: kube-system
spec:
  range: "2001:db8:secondary::/64"
  allocations: {}
```

```bash
# Check IPv6 allocations
kubectl get ippool -n kube-system ipv6-secondary-pool -o yaml

# List current allocations
kubectl get ippool -n kube-system ipv6-secondary-pool \
    -o jsonpath='{.spec.allocations}' | python3 -m json.tool
```

## Step 3: Multiple IPv6 Ranges

```yaml
# multiple-ranges-nad.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipv6-multi-range
  namespace: default
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "ipv6-multi-range",
      "type": "ipvlan",
      "master": "eth2",
      "ipam": {
        "type": "whereabouts",
        "datastore": "kubernetes",
        "range": "2001:db8:range1::/64",
        "range_start": "2001:db8:range1::10",
        "range_end": "2001:db8:range1::100",
        "kubernetes": {
          "kubeconfig": "/etc/cni/net.d/whereabouts.d/whereabouts.kubeconfig"
        }
      }
    }
```

## Step 4: Deploy Pods with Whereabouts IPv6

```yaml
# test-pods.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-ipv6-pod-1
  annotations:
    k8s.v1.cni.cncf.io/networks: ipv6-secondary-net
spec:
  containers:
    - name: app
      image: nicolaka/netshoot
      command: ["sleep", "infinity"]
---
apiVersion: v1
kind: Pod
metadata:
  name: test-ipv6-pod-2
  annotations:
    k8s.v1.cni.cncf.io/networks: ipv6-secondary-net
spec:
  containers:
    - name: app
      image: nicolaka/netshoot
      command: ["sleep", "infinity"]
```

```bash
kubectl apply -f test-pods.yaml

# Check that each pod gets a unique IPv6 address
kubectl exec test-ipv6-pod-1 -- ip -6 addr show net1
kubectl exec test-ipv6-pod-2 -- ip -6 addr show net1
# Each should have a different address from 2001:db8:secondary::/64
```

## Step 5: OverlappingRangeIPReservation

```yaml
# Reserve specific IPv6 addresses across namespaces.
# The reserved IP is encoded in metadata.name — whereabouts replaces ":" with "-"
# since ":" is not a valid character in Kubernetes resource names.
apiVersion: whereabouts.cni.cncf.io/v1alpha1
kind: OverlappingRangeIPReservation
metadata:
  name: 2001-db8-secondary--200
  namespace: kube-system
spec:
  podref: "default/special-pod"
```

## Step 6: Garbage Collection

```yaml
# whereabouts-gc-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: whereabouts-ipam-gc
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: whereabouts
          containers:
            - name: whereabouts
              image: ghcr.io/k8snetworkplumbingwg/whereabouts:latest
              command: ["/ip-control-loop", "-log-level=verbose"]
          restartPolicy: OnFailure
```

## Conclusion

Whereabouts provides cluster-wide IPv6 IPAM for secondary network interfaces, preventing duplicate addresses across nodes. Configure an IPv6 `range` in the CNI config and use `IPPool` CRDs to monitor allocations. The garbage collector CronJob cleans stale allocations from terminated pods. Monitor IPv6 pool utilization with OneUptime alerts when the pool is near capacity.
