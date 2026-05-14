# Avoid Mistakes When Configuring Static Pod IPs with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Static-ip, Pod-ip, IPAM, Kubernetes, Networking, StatefulSet

Description: Learn how to correctly manage static IP addresses for pods using Calico, including the limitations of static IP assignment for StatefulSets and the operational risks of IP pinning.

---

## Introduction

Static pod IPs - assigning the same IP address to a pod every time it is deleted and recreated or rescheduled - are sometimes requested for integration with legacy monitoring, firewall rules, or external services that cannot use DNS. While Calico supports requesting specific IPs via annotations, there is no native mechanism to track pod identity and automatically choose a unique static IP for each replica in a Deployment or StatefulSet.

This post covers the correct and incorrect approaches to static pod IPs, the limitations of each approach, and alternative patterns that achieve the same goal without the operational risks of IP pinning.

## Prerequisites

- Calico CNI v3.x
- Calico IPAM enabled
- `calicoctl` CLI configured
- `kubectl` with cluster access

## Step 1: Understand Calico's Specific IP Assignment Support

Calico supports requesting a specific IP at pod creation time, but this does NOT automatically map workload identity to a unique IP across replica lifecycle events.

```bash
# What Calico can do:

# - Assign a specific IP when a pod is first created (via annotation)
# - Reserve an IP so it's not assigned to other pods

# What Calico CANNOT do natively:
# - Guarantee the same IP is re-assigned when a pod is deleted and recreated
# - Track IP-to-pod identity across pod lifecycle events (without external tooling)

# Check if a desired IP is currently free
calicoctl ipam show --ip=10.244.1.100
```

## Step 2: The Wrong Approach - Annotating Deployment Pods for Static IPs

A common mistake is annotating a Deployment's pod template with a specific IP, expecting all replicas to use it.

```yaml
# WRONG: This will fail if you have more than 1 replica
# All pods in the Deployment request the same IP - only the first one succeeds
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-wrong
spec:
  replicas: 3                      # PROBLEM: 3 pods, same IP annotation
  selector:
    matchLabels:
      app: myapp-wrong
  template:
    metadata:
      labels:
        app: myapp-wrong
      annotations:
        # THIS WILL FAIL for replicas 2 and 3 - the IP is already taken by replica 1
        cni.projectcalico.org/ipAddrs: '["10.244.1.100"]'
    spec:
      containers:
        - name: myapp
          image: ghcr.io/example-org/myapp:latest
```

## Step 3: The Correct Approach - Single Pod With Static IP

Static IPs only work correctly for single-instance pods. Use a `replicas: 1` Deployment with `Recreate` strategy if you must pin an IP.

```yaml
# deployment-static-ip-correct.yaml
# Correct: Single-replica deployment with static IP and Recreate strategy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-static
  namespace: production
spec:
  replicas: 1                      # Single replica for static IP to work
  strategy:
    type: Recreate                 # Delete the old pod before creating the new one
                                   # Ensures the IP is released before the new pod requests it during updates
  selector:
    matchLabels:
      app: myapp-static
  template:
    metadata:
      labels:
        app: myapp-static
      annotations:
        # Request a specific IP - suitable only for a single replica
        cni.projectcalico.org/ipAddrs: '["10.244.1.100"]'
    spec:
      containers:
        - name: myapp
          image: ghcr.io/example-org/myapp:latest
```

## Step 4: Alternative - Use Headless Services for Stable DNS

Instead of static IPs, use headless Services with StatefulSets for stable DNS names - a much more Kubernetes-native approach.

```yaml
# statefulset-stable-dns.yaml
# Use StatefulSet + headless Service for stable DNS names instead of static IPs
---
# Headless Service provides stable DNS: myapp-0.myapp-headless.production.svc.cluster.local
apiVersion: v1
kind: Service
metadata:
  name: myapp-headless
  namespace: production
spec:
  clusterIP: None                  # Headless: no VIP, DNS resolves to pod IPs
  selector:
    app: myapp
  ports:
    - name: http
      port: 8080
---
# StatefulSet: pods get stable names (myapp-0, myapp-1, myapp-2)
# DNS: myapp-0.myapp-headless.production.svc.cluster.local
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: myapp
  namespace: production
spec:
  serviceName: myapp-headless      # Must match the headless service name
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: ghcr.io/example-org/myapp:latest
```

## Step 5: Pre-Reserve IPs to Prevent Conflicts

If you must use specific IPs, pre-reserve them with a Calico `IPReservation` to prevent other pods from accidentally being assigned those IPs. Manual assignments using the `cni.projectcalico.org/ipAddrs` annotation can still use reserved IPs.

```yaml
# Reserve the IPs before creating pods that will use them
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: myapp-static-ips
spec:
  reservedCIDRs:
    - 10.244.1.100
    - 10.244.1.101
```

## Best Practices

- Avoid static pod IPs whenever possible - use stable DNS names via headless Services and StatefulSets instead.
- If static IPs are required, use `replicas: 1` and `strategy: Recreate` to avoid IP conflicts across replicas.
- Pre-reserve target IPs in Calico IPAM to prevent them being allocated to other pods.
- Document the reason for each static IP assignment and add it to your network registry.
- Use Calico `GlobalNetworkPolicy` with pod labels instead of IP-based firewall rules - pod labels are stable across IP changes.

## Conclusion

Static pod IPs with Calico are supported but come with significant operational constraints. They are only appropriate for single-replica workloads with controls such as a `Recreate` update strategy, and they create operational complexity when pods are recreated or rescheduled. In most cases, the correct approach is to eliminate the need for static IPs by using stable DNS names (headless Services + StatefulSets) or Calico network policies (which use pod labels, not IPs).
