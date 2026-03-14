# Optimize Static Pod IPs with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Static-ip, Networking, Stateful

Description: Learn how to configure and optimize static IP addresses for Kubernetes pods using Calico IPAM, covering pool design, reservation strategies, and operational patterns for maintaining IP stability...

---

## Introduction

Static pod IPs are a common requirement in environments where Kubernetes workloads must integrate with external systems that use IP-based access controls - firewalls, legacy databases, audit systems, and compliance tooling. Calico IPAM's annotation-based static IP assignment makes this possible while keeping networking declarative and Kubernetes-native.

Unlike static IPs in traditional VM environments, Kubernetes pods are ephemeral and may be rescheduled. This creates unique challenges: if a pod is evicted and recreated, you need to ensure the same IP is available on the new node. Proper block affinity planning and IP reservation are critical to making static IPs work reliably across restarts.

This guide covers the full lifecycle - from pool design to pod annotation to monitoring - so your stateful workloads always come up with the expected address.

## Prerequisites

- Calico v3.18+ configured as the CNI plugin
- `calicoctl` v3.18+ installed
- Kubernetes 1.24+
- Node CIDR ranges that accommodate per-node blocks large enough for static assignments

## Step 1: Design IP Pools for Static Assignments

Create a dedicated IP pool for static pod IPs to keep them separate from the dynamic allocation pool.
```yaml
# static-ip-pool.yaml
# Dedicated IP pool for statically assigned pod IPs
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: static-pod-pool
spec:
  # CIDR dedicated to static assignments
  cidr: 10.48.100.0/24
  # Disable NAT for this pool since IPs are tracked externally
  natOutgoing: true
  # Disable auto-allocation - IPs must be explicitly requested
  disabled: false
  nodeSelector: "all()"
```

```bash
# Apply the static IP pool
calicoctl apply -f static-ip-pool.yaml
```

## Step 2: Reserve Static IPs from Dynamic Allocation

Prevent Calico IPAM from handing out the reserved IPs to other pods.
```yaml
# static-ip-reservation.yaml
# Reserve the IP range intended for static assignment
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: static-pod-reservations
spec:
  reservedCIDRs:
    # These IPs are managed statically via pod annotations
    - "10.48.100.10/32"
    - "10.48.100.11/32"
    - "10.48.100.12/32"
```

```bash
# Apply the IP reservation resource
calicoctl apply -f static-ip-reservation.yaml
```

## Step 3: Assign Static IPs to Pods

Annotate pods with the specific IP from the static pool.
```yaml
# stateful-workload.yaml
# StatefulSet with static IP annotations for each replica
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: messaging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
      annotations:
        # Request a specific IP - update per replica via an init container or external webhook
        cni.projectcalico.org/ipAddrs: '["10.48.100.10"]'
    spec:
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.5.0
```

## Step 4: Monitor Static IP Utilization

Track IPAM allocations to ensure static IPs are being properly assigned and released.
```bash
# Show all IPAM allocations for the static pool
calicoctl ipam show --show-blocks

# Check utilization of a specific IP
calicoctl ipam show --ip=10.48.100.10

# Release a leaked IP if a pod was force-deleted
calicoctl ipam release --ip=10.48.100.10
```

## Best Practices

- Use a separate IP pool exclusively for static assignments to avoid fragmentation
- Always create `IPReservation` before deploying pods that request those IPs
- Implement a webhook or admission controller to enforce one-to-one IP-to-pod mapping
- Automate IP release as part of pod deletion pipelines to prevent leaks
- Document each static IP assignment in version-controlled configuration
- Test node failure scenarios to ensure pods are rescheduled and IPs are reclaimed correctly

## Conclusion

Static pod IPs with Calico IPAM provide a reliable bridge between cloud-native Kubernetes workloads and IP-based legacy systems. With proper pool design, reservations, and lifecycle management, you can guarantee IP stability across pod restarts and rescheduling events. Treat static IP assignments as first-class infrastructure - document them, monitor them, and automate their lifecycle.
