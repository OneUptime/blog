# Monitor IP Reservation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, IP Reservation, Kubernetes, Networking, Monitoring, Exclusion

Description: Learn how to configure and monitor IP address reservations in Calico to prevent specific IPs from being assigned to pods, ensuring compatibility with existing infrastructure and avoiding IP conflicts.

---

## Introduction

Calico IPAM's IP reservation feature allows you to exclude specific IP addresses or ranges from automatic pod allocation. This is essential in environments where certain IPs within a Calico IP pool CIDR are already in use by infrastructure services - such as load balancers, gateways, monitoring agents, or reserved cloud provider IPs - that cannot be reallocated.

Without proper IP reservations, Calico may automatically assign a pod the same IP as an existing infrastructure service, causing IP conflicts that lead to unreachable services, ARP conflicts, or network instability. Monitoring IP reservations ensures they remain in place and that the reserved IPs are not accidentally allocated automatically as the cluster scales.

This guide covers configuring Calico IP reservations using IPReservation resources, monitoring their effectiveness, and alerting when reservations are missing or when usable pool capacity after reservations is low.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ using Calico IPAM
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- List of infrastructure IPs to reserve within your pod CIDR
- Documentation of which services use the reserved IPs

## Step 1: Identify IPs to Reserve

Audit your infrastructure to identify IPs that must be excluded from Calico automatic pod allocation.

Scan the pod CIDR range to find pre-existing IP assignments:

```bash
# List all IPs currently allocated to non-pod infrastructure in your pod CIDR

# Example: scan for existing services using nmap or ping sweep
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  nmap -sn 192.168.0.0/24 -oG - | grep "Up" | awk '{print $2}'

# Check what Calico has already allocated
calicoctl ipam show --show-blocks

# List any existing conflicting IPs from cloud provider metadata
# On AWS, 169.254.169.254 is the metadata service - should not be in pod CIDR
# Verify your pod CIDR doesn't overlap with these ranges
```

## Step 2: Create IPReservation Resources

Configure Calico IPReservation resources to exclude specific IPs from automatic allocation.

Create an IPReservation to exclude infrastructure IPs:

```yaml
# ip-reservations.yaml - reserve specific IPs from Calico automatic pod allocation
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-ips
spec:
  reservedCIDRs:
  - 192.168.0.1/32      # Reserved infrastructure gateway address
  - 192.168.0.2/32      # Reserved for load balancer VIP
  - 192.168.0.3/32      # Reserved for monitoring agent
  - 192.168.0.255/32    # Reserved infrastructure address
  - 192.168.1.0/28      # Reserved range for future infrastructure use
```

Apply the IP reservation:

```bash
calicoctl create -f ip-reservations.yaml

# Verify the reservation was created
calicoctl get ipreservations -o wide

# Confirm the reserved IP is not already allocated
calicoctl ipam show --ip=192.168.0.1
```

## Step 3: Verify Reservation Effectiveness

Test that reserved IPs are not assigned automatically to pods.

Create a pod without a specific IP request and verify it is not given a reserved address:

```bash
# Create a pod using normal Calico IPAM automatic allocation
kubectl run reservation-test --image=nginx

# Check the pod IP against your reserved CIDRs (it should not be reserved)
kubectl get pod reservation-test -o jsonpath='{.status.podIP}'

# Do not use cni.projectcalico.org/ipAddrs to test this behavior:
# manual IP annotations override IPReservation resources.

# Clean up the test pod
kubectl delete pod reservation-test
```

## Step 4: Monitor IP Pool Capacity After Reservations

Track remaining available IPs accounting for both allocated addresses and reserved CIDRs.

Calculate effective available IPs with reservations factored in:

```bash
# Show IPAM utilization. This reports assigned and free IPs, but reservations
# are not reported as assigned workload IPs.
calicoctl ipam show

# List all reservations
echo "=== Active IP Reservations ==="
calicoctl get ipreservations -o yaml

# Calculate usable pool size after reservations
python3 - <<'PY'
import ipaddress
pool = ipaddress.IPv4Network('192.168.0.0/16')
reserved = [
    ipaddress.IPv4Network('192.168.0.1/32'),
    ipaddress.IPv4Network('192.168.0.2/32'),
    ipaddress.IPv4Network('192.168.0.3/32'),
    ipaddress.IPv4Network('192.168.0.255/32'),
    ipaddress.IPv4Network('192.168.1.0/28'),
]
reserved_ips = sum(network.num_addresses for network in reserved)
print('Total IPs in pool:', pool.num_addresses)
print('Reserved IPs:', reserved_ips)
print('Usable IPs after reservations:', pool.num_addresses - reserved_ips)
PY
```

## Step 5: Alert on Reservation Integrity

Create monitoring to alert if IP reservations are deleted or modified.

Set up an audit check using a CronJob:

```yaml
# ipreservation-audit.yaml - periodic audit of IP reservations
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-audit
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-ipreservation-audit
rules:
- apiGroups:
  - projectcalico.org
  - crd.projectcalico.org
  resources:
  - ipreservations
  verbs:
  - get
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-ipreservation-audit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-ipreservation-audit
subjects:
- kind: ServiceAccount
  name: calico-audit
  namespace: kube-system
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ipreservation-audit
  namespace: kube-system
spec:
  schedule: "0 * * * *"    # Run every hour
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-audit
          containers:
          - name: audit
            image: calico/ctl:v3.27.0
            env:
            - name: DATASTORE_TYPE
              value: kubernetes
            command:
            - /bin/sh
            - -c
            - |
              RESERVATIONS=$(calicoctl get ipreservations 2>&1)
              if echo "$RESERVATIONS" | grep -q "infrastructure-ips"; then
                echo "IP reservation audit passed: infrastructure-ips reservation active"
              else
                echo "ALERT: infrastructure-ips reservation is missing!" >&2
                exit 1
              fi
          restartPolicy: OnFailure
```

Apply the audit CronJob:

```bash
kubectl apply -f ipreservation-audit.yaml
```

## Best Practices

- Document all IP reservations in your infrastructure CMDB with the reason each IP is reserved
- Keep a small number of IPReservation resources with multiple reserved CIDRs where possible
- Update reservations whenever new infrastructure services are added to the pod CIDR range
- Monitor pool capacity accounting for reservations to avoid unexpected exhaustion
- Use OneUptime to monitor the services that depend on reserved IPs, ensuring they are reachable and not accidentally overwritten

## Conclusion

Calico's IPReservation feature is a critical safeguard in environments where pod CIDRs overlap with existing infrastructure IP ranges. By systematically reserving infrastructure IPs, validating reservation effectiveness, and monitoring reservation integrity over time, you prevent IP conflicts that can cause hard-to-debug network outages. Integrate with OneUptime to monitor the availability of services using reserved IPs as a validation that your reservations are protecting the correct addresses.
