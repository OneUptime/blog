# Test IP Reservation in Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, ip-reservation, kubernetes, networking, testing

Description: Learn how to configure and validate Calico IP address reservation to protect specific IP ranges from pod allocation, ensuring critical service IPs and reserved addresses remain available.

---

## Introduction

Calico's IPAM allows you to reserve specific IP addresses within your pod CIDR ranges so they cannot be allocated to pods. This is important when specific IPs within the pod CIDR range are used by other services — for example, a gateway IP, a load balancer VIP, or a monitoring service that other systems depend on with a hardcoded IP address.

Without explicit IP reservation, Calico may allocate these IPs to pods, causing address conflicts that are difficult to diagnose. Testing IP reservation before production confirms that reserved addresses are consistently protected across node restarts, pod churn, and IPAM block reallocation events.

This guide covers configuring IP reservations in Calico, testing that reserved IPs are not allocated to pods, and validating reservation persistence across common cluster lifecycle events.

## Prerequisites

- Kubernetes cluster with Calico v3.20+ using Calico IPAM
- `calicoctl` CLI installed and configured
- List of IP addresses that must be reserved within the pod CIDR
- Cluster admin permissions

## Step 1: Reserve Specific IP Addresses

Use Calico's `IPReservation` resource to protect specific addresses from pod allocation.

```yaml
# ip-reservation.yaml - Reserve specific IPs within the pod CIDR
# These IPs will not be allocated to pods by Calico IPAM
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: reserved-service-ips
spec:
  reservedCIDRs:
  # Reserve the gateway IP used by the cluster router
  - 192.168.0.1/32
  # Reserve IPs used by load balancer VIPs in the pod CIDR range
  - 192.168.0.100/32
  - 192.168.0.101/32
  # Reserve an entire range for monitoring infrastructure
  - 192.168.0.200/29
```

```bash
# Apply the IP reservation
calicoctl apply -f ip-reservation.yaml

# Verify the reservation was created
calicoctl get ipreservation reserved-service-ips -o yaml

# Check IPAM status - reserved IPs should show as reserved
calicoctl ipam show --show-blocks
```

## Step 2: Verify Reserved IPs Are Not Allocated

Test that Calico does not assign reserved IPs to pods.

```bash
# Deploy a large number of pods to stress-test the reservation
# Calico should skip reserved IPs during allocation
kubectl create namespace ip-reservation-test

kubectl create deployment reservation-test \
  --image=nginx:1.25 \
  --replicas=200 \
  -n ip-reservation-test

# Wait for all pods to get IPs
kubectl rollout status deployment/reservation-test -n ip-reservation-test

# Collect all pod IPs and check that no reserved IP was allocated
kubectl get pods -n ip-reservation-test -o jsonpath='{.items[*].status.podIP}' \
  | tr ' ' '\n' \
  | sort > pod-ips.txt

# Check for reserved IPs in the allocation list
RESERVED_IPS=("192.168.0.1" "192.168.0.100" "192.168.0.101" "192.168.0.200" "192.168.0.201" "192.168.0.202" "192.168.0.203" "192.168.0.204" "192.168.0.205" "192.168.0.206" "192.168.0.207")
for ip in "${RESERVED_IPS[@]}"; do
  if grep -q "^${ip}$" pod-ips.txt; then
    echo "FAIL: Reserved IP $ip was allocated to a pod!"
  else
    echo "PASS: Reserved IP $ip correctly not allocated"
  fi
done

# Clean up test deployment
kubectl delete namespace ip-reservation-test
```

## Step 3: Test Reservation Persistence After Node Restart

Verify that IP reservations persist after nodes restart and blocks are reallocated.

```bash
# Record the current reservation
calicoctl get ipreservation reserved-service-ips -o yaml

# Simulate a node restart by draining and deleting the node
# (In a cloud environment, you can terminate and replace a node)
NODE="worker-1"
kubectl cordon $NODE
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data

# After the node restarts/rejoins, re-check the reservation
calicoctl get ipreservation reserved-service-ips -o yaml
# Reservation should still exist

# Verify new pod allocations on the returned node skip reserved IPs
kubectl uncordon $NODE
kubectl create deployment post-restart-test \
  --image=nginx:1.25 \
  --replicas=30

kubectl get pods -o wide | grep $NODE
# Pod IPs should not include reserved addresses
```

## Step 4: Test IPAM Check Reports Reserved IPs Correctly

Verify that IPAM diagnostics accurately report reserved IP status.

```bash
# Run IPAM check to confirm no inconsistencies
calicoctl ipam check

# Show detailed IPAM state including reservations
calicoctl ipam show --show-blocks

# Check for any leaked allocations (should be zero after cleanup)
calicoctl ipam show | grep "Leaked\|leaked"

# Verify reserved CIDR shows in IPAM output as reserved (not allocated)
calicoctl ipam show --show-blocks | grep -A5 "192.168.0.1"
```

## Best Practices

- Create IP reservations before deploying any workloads to a new cluster — retroactively adding reservations does not reclaim already-allocated IPs
- Reserve entire /29 or larger ranges for services that may scale (e.g., monitoring infrastructure) rather than individual /32 addresses
- Document reserved IPs alongside their purpose in your platform runbook to explain why the range appears unused
- Monitor the ratio of reserved IPs to total pool size — excessive reservations reduce pod capacity without warning
- Test reservation behavior after Calico upgrades since IPAM behavior can change between versions
- Include reserved IP validation in your cluster provisioning automation to catch misconfiguration immediately

## Conclusion

Pre-production testing of Calico IP reservations ensures that critical service IPs are consistently protected from pod allocation across all cluster lifecycle events. By stress-testing reservations with high pod density and validating persistence after node restarts, you prevent the subtle IP conflicts that cause production incidents when reserved addresses are unexpectedly assigned to pods.
