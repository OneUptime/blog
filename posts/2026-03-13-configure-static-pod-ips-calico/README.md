# Configure Static Pod IPs with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Static-ip, Kubernetes, Stateful, Networking

Description: Learn how to configure static, persistent IP addresses for Kubernetes pods using Calico IPAM, ensuring workloads maintain the same IP across restarts and rescheduling.

---

## Introduction

Static pod IPs are a requirement for certain enterprise workloads: distributed databases that use IP-based cluster membership, applications with hardcoded configuration referencing pod IPs, or compliance environments that require IP-to-workload traceability. While Kubernetes is designed for dynamic IP allocation, Calico provides mechanisms to request specific IP addresses for pods.

The challenge with static pod IPs in Kubernetes is that pods are ephemeral-they can be deleted and recreated, so the static IP request must be present when each replacement pod is created. Calico's approach uses IP annotations to request a specific IP and IPReservation resources to keep those addresses out of Calico's automatic allocation path.

This guide covers the techniques for achieving stable pod IPs using Calico, including annotation-based assignment and IP reservation strategies.

## Prerequisites

- Kubernetes cluster with Calico IPAM enabled
- `calicoctl` CLI configured
- Pods that need static IPs must include the Calico IP annotation when they are created
- IP addresses must be within configured Calico IP pools

## Step 1: Reserve IPs in the Calico IPAM Pool

Before assigning static IPs to pods, ensure the IPs are in an active pool, available, and reserved from automatic allocation.

```bash
# List available IP pools

calicoctl get ippool -o wide

# Verify target IPs are not already allocated
calicoctl ipam show --ip=10.244.200.1
calicoctl ipam show --ip=10.244.200.2
calicoctl ipam show --ip=10.244.200.3

# Create a dedicated pool for static IP assignments if needed
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: static-pod-ips
spec:
  # Dedicated range for static IP pods
  cidr: 10.244.200.0/26
  ipipMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
EOF

# Reserve the exact IPs so Calico does not assign them automatically
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: static-pod-ip-reservations
spec:
  reservedCIDRs:
  - 10.244.200.1/32
  - 10.244.200.2/32
  - 10.244.200.3/32
EOF
```

## Step 2: Create a Pod with a Static IP Annotation

Assign a specific IP to a pod using the Calico IPAM annotation.

```yaml
# stateful-pod-static-ip.yaml - Pod with a static IP assigned via Calico
apiVersion: v1
kind: Pod
metadata:
  name: kafka-broker-0
  namespace: messaging
  annotations:
    # Assign a specific static IP to this pod
    # This IP must exist within an active Calico IP pool
    cni.projectcalico.org/ipAddrs: '["10.244.200.1"]'
spec:
  containers:
  - name: kafka
    image: bitnami/kafka:3.5
    env:
    - name: KAFKA_BROKER_ID
      value: "0"
    - name: KAFKA_ADVERTISED_LISTENERS
      # Use the static IP for Kafka's advertised listener
      value: "PLAINTEXT://10.244.200.1:9092"
    ports:
    - containerPort: 9092
```

```bash
# Apply the pod and verify the static IP assignment
kubectl create namespace messaging --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f stateful-pod-static-ip.yaml
kubectl get pod kafka-broker-0 -n messaging -o wide
# Verify the IP column shows 10.244.200.1
```

## Step 3: Use a Dedicated IP Pool for a StatefulSet

Use a combination of pod anti-affinity and annotations to restrict StatefulSet pods to the dedicated pool. A StatefulSet pod template cannot assign a different `cni.projectcalico.org/ipAddrs` value to each replica; use separate per-pod manifests if each replica requires an exact IP address.

```yaml
# statefulset-kafka-static.yaml - StatefulSet restricted to the static IP pool
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: messaging
spec:
  serviceName: kafka-headless
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
      annotations:
        # This restricts pod IP assignment to the named pool, but does not
        # guarantee the same exact IP after a pod is recreated.
        cni.projectcalico.org/ipv4pools: '["static-pod-ips"]'
    spec:
      # Spread replicas across nodes to prevent co-location
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: kafka
            topologyKey: kubernetes.io/hostname
      containers:
      - name: kafka
        image: bitnami/kafka:3.5
```

## Step 4: Validate and Verify Static IP Persistence

Test that the pod retains its IP across restarts.

```bash
# Record the current IP of the static pod
INITIAL_IP=$(kubectl get pod kafka-broker-0 -n messaging -o jsonpath='{.status.podIP}')
echo "Initial IP: $INITIAL_IP"

# Delete and re-create the pod to test IP persistence
kubectl delete pod kafka-broker-0 -n messaging
kubectl apply -f stateful-pod-static-ip.yaml

# Wait for pod to restart and check its IP
kubectl wait pod/kafka-broker-0 -n messaging --for=condition=Ready --timeout=60s
NEW_IP=$(kubectl get pod kafka-broker-0 -n messaging -o jsonpath='{.status.podIP}')
echo "IP after restart: $NEW_IP"

# Verify IPs match
[ "$INITIAL_IP" = "$NEW_IP" ] && echo "Static IP preserved" || echo "IP changed!"
```

## Best Practices

- Add the `cni.projectcalico.org/ipAddrs` annotation before the pod is created; adding it to a running pod has no effect
- Use IPReservation resources for individual static IPs so they are not consumed by automatic allocation
- Use a dedicated IP pool for static assignments to avoid conflicts with dynamic pools
- Document all static IP assignments in your infrastructure CMDB or network documentation
- Implement monitoring to alert if a statically assigned pod IP changes unexpectedly
- Consider using Kubernetes Services with stable DNS names instead of static IPs when possible

## Conclusion

Configuring static pod IPs with Calico requires using IPAM annotations when pods are created and reserving those addresses so automatic allocation does not consume them first. While Kubernetes is primarily designed for dynamic IP allocation, Calico's flexible IPAM system accommodates the subset of workloads that genuinely require IP stability. Use this capability judiciously and always document static IP assignments to maintain a clear network topology record.
