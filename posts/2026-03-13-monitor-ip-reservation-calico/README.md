# Monitor IP Reservation in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, IP Reservation, Kubernetes, Networking, Monitoring, Exclusion

Description: Learn how to configure and monitor IP address reservations in Calico to prevent specific IPs from being assigned to pods, ensuring compatibility with existing infrastructure and avoiding IP conflicts.

---

## Introduction

Calico IPAM's IP reservation feature allows you to exclude specific IP addresses or ranges from pod allocation. This is essential in environments where certain IPs within a Calico IP pool CIDR are already in use by infrastructure services — such as load balancers, gateways, monitoring agents, or reserved cloud provider IPs — that cannot be reallocated.

Without proper IP reservations, Calico may assign a pod the same IP as an existing infrastructure service, causing IP conflicts that lead to unreachable services, ARP poisoning, or network instability. Monitoring IP reservations ensures they remain in place and that the reserved IPs are not accidentally allocated as the cluster scales.

This guide covers configuring Calico IP reservations using IPReservation resources, monitoring their effectiveness, and alerting when reserved IPs are at risk of exhausting the available pool.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ using Calico IPAM
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- List of infrastructure IPs to reserve within your pod CIDR
- Documentation of which services use the reserved IPs

## Step 1: Identify IPs to Reserve

Audit your infrastructure to identify IPs that must be excluded from Calico pod allocation.

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

Configure Calico IPReservation resources to exclude specific IPs from allocation.

Create an IPReservation to exclude infrastructure IPs:

```yaml
# ip-reservations.yaml - reserve specific IPs from Calico pod allocation
apiVersion: projectcalico.org/v3
kind: IPReservation
metadata:
  name: infrastructure-ips
spec:
  reservedCIDRs:
  - 192.168.0.1/32      # Default gateway for the pod CIDR
  - 192.168.0.2/32      # Reserved for load balancer VIP
  - 192.168.0.3/32      # Reserved for monitoring agent
  - 192.168.0.255/32    # Broadcast address
  - 192.168.1.0/28      # Reserved range for future infrastructure use
```

Apply the IP reservation:

```bash
calicoctl create -f ip-reservations.yaml

# Verify the reservation was created
calicoctl get ipreservations -o wide

# Confirm reserved IPs are excluded from allocation
calicoctl ipam show | grep -i "reserved"
```

## Step 3: Verify Reservation Effectiveness

Test that reserved IPs cannot be assigned to pods.

Attempt to create a pod requesting a reserved IP to verify it is blocked:

```bash
# Try to assign a reserved IP to a pod (should fail or assign a different IP)
kubectl run reservation-test --image=nginx \
  --annotations='cni.projectcalico.org/ipAddrs=["192.168.0.1"]'

# Check if the pod received the reserved IP (it should not)
kubectl get pod reservation-test -o jsonpath='{.status.podIP}'

# Verify the IP was rejected in calico-node logs
kubectl logs -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  --tail=20 | grep -i "reserve\|excluded"
```

## Step 4: Monitor IP Pool Capacity After Reservations

Track remaining available IPs accounting for both allocated and reserved addresses.

Calculate effective available IPs with reservations factored in:

```bash
# Show IPAM utilization which should reflect reservations
calicoctl ipam show

# List all reservations and their impact on pool size
echo "=== Active IP Reservations ==="
calicoctl get ipreservations -o yaml | \
  grep -E "name:|reservedCIDRs:" -A5

# Calculate IPs reserved vs total pool size
TOTAL_POOL=$(python3 -c "
import ipaddress
pool = ipaddress.IPv4Network('192.168.0.0/16')
print('Total IPs in pool:', pool.num_addresses)
")
echo "$TOTAL_POOL"

echo "IPs reserved (check ipreservations):"
calicoctl get ipreservations -o yaml | grep "- " | wc -l
```

## Step 5: Alert on Reservation Integrity

Create monitoring to alert if IP reservations are deleted or modified.

Set up an audit check using a CronJob:

```yaml
# ipreservation-audit.yaml - periodic audit of IP reservations
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
- Create separate IPReservation resources per infrastructure category (gateways, load balancers, monitoring) for clarity
- Update reservations whenever new infrastructure services are added to the pod CIDR range
- Monitor pool capacity accounting for reservations to avoid unexpected exhaustion
- Use OneUptime to monitor the services that depend on reserved IPs, ensuring they are reachable and not accidentally overwritten

## Conclusion

Calico's IPReservation feature is a critical safeguard in environments where pod CIDRs overlap with existing infrastructure IP ranges. By systematically reserving infrastructure IPs, validating reservation effectiveness, and monitoring reservation integrity over time, you prevent IP conflicts that can cause hard-to-debug network outages. Integrate with OneUptime to monitor the availability of services using reserved IPs as a validation that your reservations are protecting the correct addresses.
