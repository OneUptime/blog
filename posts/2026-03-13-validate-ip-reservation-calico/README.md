# Validate IP Reservation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Ip-reservation, Kubernetes, Networking, Ip-management

Description: Learn how to validate Calico's IP reservation functionality, ensuring that specific IP addresses are correctly reserved from allocation and cannot be assigned to pods.

---

## Introduction

Calico's IP reservation feature allows you to mark specific IP addresses within an IP pool as reserved, preventing them from being assigned to pods. This is essential in environments where certain IPs within the pod CIDR range are already in use by other systems, are reserved for future use, or must remain free for infrastructure devices like gateways, monitoring agents, or virtual appliances.

Without proper IP reservations, Calico's IPAM may allocate IPs that are already in use elsewhere in your network, leading to IP conflicts that cause pod connectivity failures. These conflicts are particularly difficult to diagnose because the pod may start successfully but fail to communicate, or two different services may appear to have the same IP.

This guide covers how to configure and validate IP reservations in Calico IPAM.

## Prerequisites

- Kubernetes cluster with Calico CNI and Calico IPAM
- `calicoctl` CLI with datastore access
- Knowledge of which IPs need to be reserved in your pod CIDR range

## Step 1: Create IP Reservations

Use the `IPAMConfig` or direct block manipulation to reserve specific IPs.

```yaml
# ipreservation.yaml - reserve specific IPs in a Calico IP pool
# Method: Use a dedicated IPPool for reserved IPs and mark it as disabled
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: reserved-infrastructure-ips
spec:
  cidr: 10.244.0.0/28    # Reserve a small block for infrastructure IPs
  disabled: true          # Disabled pools cannot be used for pod allocation
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: false
```

```bash
# Apply the reservation pool
calicoctl apply -f ipreservation.yaml

# Verify the reservation pool is created and disabled
calicoctl get ippool reserved-infrastructure-ips -o yaml | grep "disabled:"
```

## Step 2: Reserve Individual IPs Using IPAM Handles

For finer-grained reservation of specific IPs within an active pool.

```bash
# Reserve a specific IP address so it cannot be auto-assigned
# This uses calicoctl to allocate the IP with a specific handle
calicoctl ipam release --ip=10.244.1.1 2>/dev/null || true
calicoctl ipam allocate --ip=10.244.1.1 --handle="reserved-gateway-ip" \
  --note="Infrastructure gateway - do not allocate to pods"

# Verify the reservation
calicoctl ipam show --show-handles | grep "reserved-gateway-ip"
```

## Step 3: Validate Reserved IPs Are Not Assigned to Pods

Confirm that reserved IPs have not been allocated to any running pods.

```bash
# List all pod IPs
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort > /tmp/pod-ips.txt

# List reserved IPs (from handles)
calicoctl ipam show --show-handles | \
  grep "reserved-" | awk '{print $1}' | sort > /tmp/reserved-ips.txt

# Check if any reserved IP appears in pod list (should be empty)
comm -12 /tmp/pod-ips.txt /tmp/reserved-ips.txt
echo "Conflicts found (should be empty):"
```

## Step 4: Test That Reserved IPs Cannot Be Allocated

Attempt to deploy a pod with a specific IP that should be reserved.

```bash
# Try to request the reserved IP for a pod via annotation
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

# If the reservation is working correctly, the pod should fail to start
# or receive a different IP
kubectl get pod test-reserved-ip -o jsonpath='{.status.podIP}'
kubectl delete pod test-reserved-ip
```

## Step 5: Audit All Reservations

Maintain visibility into all IP reservations across the cluster.

```bash
# List all IPAM handles to see all reservations and their notes
calicoctl ipam show --show-handles

# Check for any reservations that may be stale (from deleted infrastructure)
calicoctl ipam show --show-handles | grep "reserved-"

# View the total reserved IP count
RESERVED=$(calicoctl ipam show --show-handles | grep "reserved-" | wc -l)
echo "Total reserved IPs: $RESERVED"
```

## Best Practices

- Document all IP reservations in your network IPAM records alongside the Calico reservations
- Use consistent naming conventions for reservation handles (e.g., `reserved-<purpose>-<ip>`)
- Reserve the first and last few IPs in each block for infrastructure use before deploying workloads
- Review reservations periodically to remove stale entries that may be consuming scarce addresses
- Use disabled IP pools for reserving entire address ranges rather than individual IPs when possible

## Conclusion

Validating IP reservations in Calico ensures that critical infrastructure IPs are protected from pod allocation and that your reserved address inventory is accurate. By configuring reservations correctly and periodically auditing them, you prevent IP conflicts that can cause intermittent and difficult-to-diagnose connectivity failures.
