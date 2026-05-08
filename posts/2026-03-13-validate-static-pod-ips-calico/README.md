# Validate Static Pod IPs with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Static IP, Networking

Description: Learn how to validate static IP address persistence for pods in Calico, ensuring that critical workloads retain their IP addresses across pod restarts and node rescheduling events.

---

## Introduction

In most Kubernetes deployments, pod IPs change when pods are rescheduled. For stateless microservices, this is acceptable since services handle routing. However, for stateful workloads like databases, message brokers, or applications with IP-based licensing, IP persistence is a hard requirement.

Calico supports static pod IPs through IPAM annotations that request specific addresses. The challenge is not just assigning the IP initially, but validating that the IP persists correctly across the pod lifecycle - restarts, rescheduling events, and cluster upgrades. This guide covers the full validation workflow for static pod IPs in Calico.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` CLI configured
- `kubectl` with cluster admin access
- StatefulSet or Deployment managing the target workload
- A static IP that is inside a configured Calico IP pool and not currently in use

## Step 1: Configure Static IP on a Pod or StatefulSet

Assign a static IP using Calico IPAM annotations on the pod template.

```yaml
# statefulset-static-ip.yaml - StatefulSet with static IP assignment

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db-statefulset
spec:
  serviceName: "db"
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
      annotations:
        # Assign a specific static IP to this pod
        cni.projectcalico.org/ipAddrs: '["192.168.10.50"]'
    spec:
      containers:
      - name: database
        image: postgres:14-alpine
        env:
        - name: POSTGRES_PASSWORD
          value: "testpassword"
```

The IP address must be in a Calico IP pool, and the annotation must be present when the pod is created. Adding the annotation to an existing pod does not change its IP.

```bash
# Deploy the StatefulSet with static IP
kubectl apply -f statefulset-static-ip.yaml

# Verify the pod received the expected static IP
kubectl get pod db-statefulset-0 -o wide
```

## Step 2: Validate IP in Calico IPAM

Confirm that Calico IPAM has recorded the static IP allocation correctly.

```bash
# Check the IP is allocated in Calico IPAM
calicoctl ipam show --ip=192.168.10.50

# Get the workload endpoint and verify the IP
calicoctl get workloadendpoint --all-namespaces -o yaml | grep -B5 "192.168.10.50"
```

## Step 3: Test IP Persistence Across Pod Restarts

Validate that the static IP is retained when the pod restarts.

```bash
# Record the current pod IP
ORIGINAL_IP=$(kubectl get pod db-statefulset-0 -o jsonpath='{.status.podIP}')
echo "Original IP: $ORIGINAL_IP"

# Delete the pod to trigger a restart (StatefulSet will recreate it)
kubectl delete pod db-statefulset-0

# Wait for the pod to come back up
kubectl wait --for=condition=Ready pod/db-statefulset-0 --timeout=120s

# Confirm the pod retained its static IP
NEW_IP=$(kubectl get pod db-statefulset-0 -o jsonpath='{.status.podIP}')
echo "IP after restart: $NEW_IP"
[ "$ORIGINAL_IP" = "$NEW_IP" ] && echo "PASS: IP retained" || echo "FAIL: IP changed"
```

## Step 4: Test IP Behavior After Rescheduling

Validate static IP behavior when the pod is rescheduled to another node.

```bash
# Check which node the pod is on
kubectl get pod db-statefulset-0 -o wide

# Cordon the node to force scheduling away from it
kubectl cordon <current-node>

# Delete the pod to force rescheduling to another node
kubectl delete pod db-statefulset-0

# Wait for rescheduling
kubectl wait --for=condition=Ready pod/db-statefulset-0 --timeout=120s

# Verify the static IP is maintained on the new node
kubectl get pod db-statefulset-0 -o wide

# Uncordon the original node
kubectl uncordon <original-node>
```

## Step 5: Validate the Static IP Is Reserved for Manual Use

Ensure that Calico will not automatically assign the static IP to another workload. The pod annotation requests the address, but it does not reserve the address while the pod is absent. Reserve the address with an `IPReservation`, or use a dedicated IP pool with `assignmentMode: Manual` for static assignments.

```bash
# Verify any IPReservation resources that protect manual assignments
calicoctl get ipreservation -o yaml

# Verify the IP pool used for static assignments
calicoctl get ippool -o yaml

# Confirm the static IP is currently allocated to the expected pod
calicoctl ipam show --ip=192.168.10.50
```

## Best Practices

- Use an `IPReservation`, or a dedicated IP pool with `assignmentMode: Manual`, for static IPs separate from the dynamic allocation pool
- Document all static IP assignments in a network registry
- Test IP persistence during rolling upgrades of the cluster as well as pod restarts
- Set up monitoring alerts for IP allocation failures on pods with static IP annotations
- Consider using headless Services with stable DNS names as an alternative to static IPs

## Conclusion

Static pod IPs in Calico require careful validation across the full pod lifecycle - initial assignment, restarts, and node rescheduling. By using Calico IPAM annotations and validating persistence through each scenario, you can reliably provide stable addressing for workloads that require it. Always combine static IP validation with reservation checks to prevent accidental address reuse over time.
