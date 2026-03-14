# Troubleshoot Static Pod IPs in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Static IPs, IPAM, Networking, Troubleshooting

Description: A guide to diagnosing and resolving issues with static pod IP configurations in Calico, covering annotation-based IP assignment, IP persistence across restarts, and IPAM conflict management.

---

## Introduction

Static pod IPs in Kubernetes are useful for legacy application integrations, network appliances, and compliance requirements where pod IP addresses must be predictable and stable. Calico supports static IPs through IPAM annotations, but maintaining truly static IPs across pod restarts and node failures requires additional configuration beyond just the annotation.

The key challenge with static pod IPs is that Kubernetes treats pods as ephemeral — when a pod is deleted and recreated, it's a new pod that must request its IP again. Without proper configuration, a "static" IP pod may receive a different IP after a node failure or scheduler restart. Additionally, IP conflicts arise when the annotation requests an IP that was allocated to a different pod during a cluster disruption.

This guide covers how to implement reliable static pod IP configurations in Calico and troubleshoot the common failure modes.

## Prerequisites

- `calicoctl` CLI installed
- `kubectl` access to the cluster
- Calico IPAM managing pod IPs (not cloud provider IPAM)

## Step 1: Implement Static IP Assignment with Calico Annotations

The `cni.projectcalico.org/ipAddrs` annotation is Calico's mechanism for requesting a specific IP for a pod. When the pod is recreated, the annotation ensures the same IP is requested again.

Configure a pod or StatefulSet with a static IP:

```yaml
# static-ip-statefulset.yaml — StatefulSet with static IP via Calico IPAM annotation
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
      annotations:
        # Calico IPAM annotation to request a specific IP
        # The IP must be within an active Calico IP pool
        cni.projectcalico.org/ipAddrs: '["10.244.10.50"]'
    spec:
      containers:
        - name: database
          image: postgres:15
          ports:
            - containerPort: 5432
```

```bash
# Apply the StatefulSet
kubectl apply -f static-ip-statefulset.yaml

# Verify the pod received the static IP
kubectl get pod database-0 -o wide
```

## Step 2: Reserve the Static IP to Prevent Dynamic Allocation

Without an IPReservation, Calico may allocate the static IP to a different pod before the static-IP pod restarts. Reserve the IP to prevent this.

Create an IPReservation for all static pod IPs:

```yaml
# static-ip-reservation.yaml — Reserve IPs used by static pod assignments
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: static-pod-ips
spec:
  reservedCIDRs:
    # Reserve the database pod's static IP
    - "10.244.10.50/32"
    # Reserve other static IPs in this block
    - "10.244.10.51/32"
    - "10.244.10.52/32"
```

```bash
# Apply the IPReservation
calicoctl apply -f static-ip-reservation.yaml

# Verify the reservation is in place
calicoctl get ipreservation static-pod-ips -o yaml
```

## Step 3: Diagnose Static IP Conflicts and Assignment Failures

When a static IP pod fails to start or receives a different IP, check for the common conflict scenarios.

Investigate IP assignment failures:

```bash
# Check pod events for IPAM conflict messages
kubectl describe pod database-0 | grep -A10 "Events:"

# Determine which pod currently holds the requested IP
STATIC_IP="10.244.10.50"
kubectl get pods -A -o json | \
  jq -r --arg ip "$STATIC_IP" '.items[] | select(.status.podIP == $ip) | .metadata.namespace + "/" + .metadata.name'

# Check Calico IPAM allocation for the specific IP
calicoctl ipam show --ip=$STATIC_IP

# If the IP is stale (allocated but pod no longer exists), release it
calicoctl ipam release --ip=$STATIC_IP
```

## Step 4: Validate Static IP Persistence After Pod Restart

After configuration, test that the static IP survives a pod deletion and recreation.

Test IP persistence:

```bash
# Record the current IP
kubectl get pod database-0 -o wide

# Delete the pod (StatefulSet will recreate it)
kubectl delete pod database-0

# Wait for the pod to restart
kubectl wait --for=condition=ready pod/database-0 --timeout=120s

# Verify the pod received the same static IP
kubectl get pod database-0 -o wide

# Test connectivity to the pod via its static IP (should work after restart)
kubectl run ip-test --image=nicolaka/netshoot --restart=Never -- sleep 300
kubectl exec ip-test -- ping -c 3 10.244.10.50
kubectl delete pod ip-test
```

## Best Practices

- Always create an `IPReservation` for any IP you intend to assign statically — this prevents races during pod restarts
- Maintain a static IP registry (CMDB entry or ConfigMap) mapping pod names to reserved IPs
- Use StatefulSets rather than Deployments for pods requiring static IPs — StatefulSets' pod identity model works better with static addressing
- Validate that static IPs are within an active Calico IP pool CIDR before applying annotations
- Test static IP behavior during node failures by cordoning a node and verifying pods restart with the same IPs on a different node

## Conclusion

Static pod IPs in Calico require two components: the IPAM annotation to request a specific IP and an IPReservation to prevent that IP from being allocated elsewhere. The combination of these two resources creates reliable, persistent IP assignments that survive pod restarts and scheduler events. When static IP assignment fails, the most common causes are missing IPReservation (IP allocated elsewhere during downtime) and annotation format errors — both diagnosable with `calicoctl ipam show` and pod event inspection.
