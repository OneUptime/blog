# Validate IP Reservation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Ip-reservation, Kubernetes, Networking, Ip-management

Description: Learn how to validate Calico's IP reservation functionality, ensuring that specific IP addresses are correctly reserved from allocation and cannot be assigned to pods.

---

## Introduction

Calico's IP reservation feature allows you to mark specific IP addresses within an IP pool as reserved, preventing them from being automatically assigned to pods. This is essential in environments where certain IPs within the pod CIDR range are already in use by other systems, are reserved for future use, or must remain free for infrastructure devices like gateways, monitoring agents, or virtual appliances.

Without proper IP reservations, Calico's IPAM may allocate IPs that are already in use elsewhere in your network, leading to IP conflicts that cause pod connectivity failures. These conflicts are particularly difficult to diagnose because the pod may start successfully but fail to communicate, or two different services may appear to have the same IP.

This guide covers how to configure and validate IP reservations in Calico IPAM.

## Prerequisites

- Kubernetes cluster with Calico CNI and Calico IPAM
- `calicoctl` CLI with datastore access
- Knowledge of which IPs need to be reserved in your pod CIDR range

## Step 1: Create IP Reservations

Use the `IPReservation` resource to reserve specific IPs or CIDR ranges.

```yaml
# ipreservation.yaml - reserve specific IPs in a Calico IP pool

apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-reserved-ips
spec:
  reservedCIDRs:
    - 10.244.1.1/32       # Reserve a single infrastructure IP
    - 10.244.0.0/28       # Reserve a small block for infrastructure IPs
```

```bash
# Apply the reservation
calicoctl apply -f ipreservation.yaml

# Verify the reservation is created
calicoctl get ipreservation infrastructure-reserved-ips -o yaml
```

## Step 2: Reserve Individual IPs

For finer-grained reservation of specific IPs within an active pool.

```yaml
# gateway-reservation.yaml - reserve one specific IP
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: reserved-gateway-ip
spec:
  reservedCIDRs:
    - 10.244.1.1/32
```

```bash
calicoctl apply -f gateway-reservation.yaml
calicoctl get ipreservation reserved-gateway-ip -o yaml
```

## Step 3: Validate Reserved IPs Are Not Assigned to Pods

Confirm that reserved IPs have not been allocated to any running pods.

```bash
# List all pod IPs
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort > /tmp/pod-ips.txt

# List reserved single IPs from IPReservation resources
calicoctl get ipreservation -o yaml | \
  awk '/reservedCIDRs:/ {in_list=1; next} in_list && /^[[:space:]]*-/ {gsub(/^[[:space:]]*-[[:space:]]*/, ""); sub(/\/32$/, ""); print} /^[^[:space:]-]/ {in_list=0}' | sort > /tmp/reserved-ips.txt

# Check if any reserved IP appears in pod list (should be empty)
comm -12 /tmp/pod-ips.txt /tmp/reserved-ips.txt
echo "Conflicts found (should be empty):"
```

## Step 4: Test How Manual IP Requests Behave

IP reservations prevent automatic assignment. Calico annotations that request a specific IP address can still override an `IPReservation`, so use this test to confirm the documented manual-assignment behavior.

```bash
# Request the reserved IP for a pod via annotation
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-reserved-ip
  annotations:
    cni.projectcalico.org/ipAddrs: '["10.244.1.1"]'
spec:
  containers:
    - name: test
      image: busybox:1.36
      command: ["sleep", "30"]
EOF

# The pod can receive the reserved IP because manual IP requests override IPReservation
kubectl get pod test-reserved-ip -o jsonpath='{.status.podIP}'
kubectl delete pod test-reserved-ip
```

## Step 5: Audit All Reservations

Maintain visibility into all IP reservations across the cluster.

```bash
# List all IPReservation resources
calicoctl get ipreservation -o yaml

# Check for any reservations that may be stale (from deleted infrastructure)
calicoctl get ipreservation

# View the total reserved CIDR count
RESERVED=$(calicoctl get ipreservation -o yaml | grep -c "^[[:space:]]*- ")
echo "Total reserved CIDRs: $RESERVED"
```

## Best Practices

- Document all IP reservations in your network IPAM records alongside the Calico reservations
- Use consistent naming conventions for reservation resources (e.g., `reserved-<purpose>-<ip>`)
- Reserve the first and last few IPs in each block for infrastructure use before deploying workloads
- Review reservations periodically to remove stale entries that may be consuming scarce addresses
- Use a separate IP pool with a node selector such as `"!all()"` when you want to reserve a whole pool for manual assignments

## Conclusion

Validating IP reservations in Calico ensures that critical infrastructure IPs are protected from automatic pod allocation and that your reserved address inventory is accurate. By configuring reservations correctly and periodically auditing them, you prevent IP conflicts that can cause intermittent and difficult-to-diagnose connectivity failures.
