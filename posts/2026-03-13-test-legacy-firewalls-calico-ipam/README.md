# Test Legacy Firewall Compatibility with Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, firewall, kubernetes, networking, testing, compatibility

Description: Learn how to validate Calico IPAM compatibility with legacy firewalls that have static rules for pod CIDRs, ensuring that IP address changes do not break firewall policies when pods move between nodes.

---

## Introduction

Many enterprises run Kubernetes clusters alongside legacy infrastructure protected by traditional firewalls with static IP-based rules. When Calico IPAM allocates pod IPs from a CIDR range, legacy firewalls must be configured to allow that entire range rather than individual pod IPs. The challenge arises when the firewall team has not configured rules for the full CIDR, only for specific IPs based on the initial pod placement.

As pods restart and migrate between nodes, they receive new IPs from Calico IPAM. If the firewall only allows specific IPs (based on the original pod placement), the firewall breaks connectivity after any pod restart. Testing Calico IPAM behavior with your legacy firewall configuration before production deployment reveals these gaps and drives the firewall rule updates needed before workloads go live.

This guide demonstrates how to test pod IP persistence, simulate pod migrations, and validate that your firewall rule design correctly handles Calico IPAM's dynamic IP allocation.

## Prerequisites

- Kubernetes cluster with Calico v3.20+
- Access to legacy firewall for testing (or a simulated iptables firewall)
- `calicoctl` CLI installed
- Understanding of current firewall rule structure
- Cluster admin permissions

## Step 1: Document Pod IP Allocation Behavior

Understand how Calico assigns IPs to help plan firewall rules.

```bash
# Check the CIDR range used by Calico IPAM
calicoctl get ippools -o yaml | grep cidr

# Deploy a test pod and record its initial IP
kubectl run fw-test-pod-1 --image=nginx:1.25 --labels="app=fw-test"
kubectl get pod fw-test-pod-1 -o jsonpath='{.status.podIP}'
# Record this IP

# Delete and recreate the pod - it will likely get a different IP from IPAM
kubectl delete pod fw-test-pod-1
kubectl run fw-test-pod-1 --image=nginx:1.25 --labels="app=fw-test"
kubectl get pod fw-test-pod-1 -o jsonpath='{.status.podIP}'
# This IP may differ from the first - confirms legacy IP-based rules will break
```

## Step 2: Test Firewall Rule Designs

Test different firewall rule approaches using iptables to simulate legacy firewall behavior.

```bash
# APPROACH 1: WRONG - Static IP rule (simulates legacy firewall mistake)
# This will break after pod restarts
INITIAL_POD_IP=$(kubectl get pod fw-test-pod-1 -o jsonpath='{.status.podIP}')

# Simulate a legacy firewall rule that only allows the initial pod IP
iptables -I FORWARD -d $INITIAL_POD_IP -p tcp --dport 8080 -j ACCEPT
iptables -I FORWARD -d $INITIAL_POD_IP -j DROP  # Drop all other traffic to this IP

# Test connectivity while pod has the initial IP
kubectl exec test-client -- curl --max-time 5 http://$INITIAL_POD_IP:8080/
# Expected: HTTP 200

# Now delete and recreate the pod - it gets a new IP
kubectl delete pod fw-test-pod-1
kubectl run fw-test-pod-1 --image=nginx:1.25 --labels="app=fw-test"
NEW_POD_IP=$(kubectl get pod fw-test-pod-1 -o jsonpath='{.status.podIP}')

# Test with old IP - this simulates what legacy firewall does after pod restart
kubectl exec test-client -- curl --max-time 5 http://$NEW_POD_IP:8080/
# Expected: Fails - because the old firewall rule used the original IP

# Remove the wrong rule
iptables -D FORWARD -d $INITIAL_POD_IP -p tcp --dport 8080 -j ACCEPT
iptables -D FORWARD -d $INITIAL_POD_IP -j DROP
```

```bash
# APPROACH 2: CORRECT - CIDR-based rule (correct legacy firewall design)
CALICO_POD_CIDR="192.168.0.0/16"  # Replace with your Calico IPAM CIDR

# Apply a CIDR-based firewall rule that survives pod restarts
iptables -I FORWARD -d $CALICO_POD_CIDR -p tcp --dport 8080 -j ACCEPT

# Test connectivity after pod restart - should work with any IP in the CIDR
kubectl delete pod fw-test-pod-1
kubectl run fw-test-pod-1 --image=nginx:1.25 --labels="app=fw-test"
NEW_POD_IP=$(kubectl get pod fw-test-pod-1 -o jsonpath='{.status.podIP}')
kubectl exec test-client -- curl --max-time 5 http://$NEW_POD_IP:8080/
# Expected: HTTP 200 - CIDR rule works regardless of which IP was assigned

# Clean up
iptables -D FORWARD -d $CALICO_POD_CIDR -p tcp --dport 8080 -j ACCEPT
```

## Step 3: Test with Topology-Aware IP Pools

If using topology-aware pools, verify that firewall rules cover all zone-specific CIDRs.

```bash
# List all IP pools and their CIDRs
calicoctl get ippools -o yaml | grep -E "name:|cidr:"

# For each zone pool, verify the firewall allows the corresponding CIDR
# Zone A: 10.244.0.0/18
# Zone B: 10.244.64.0/18
# Zone C: 10.244.128.0/18

# Test that a pod in Zone A with IP from 10.244.0.0/18 is reachable
kubectl run zone-a-pod \
  --image=nginx:1.25 \
  --overrides='{"spec":{"affinity":{"nodeAffinity":{"requiredDuringSchedulingIgnoredDuringExecution":{"nodeSelectorTerms":[{"matchExpressions":[{"key":"topology.kubernetes.io/zone","operator":"In","values":["us-east-1a"]}]}]}}}}}'

ZONE_A_IP=$(kubectl get pod zone-a-pod -o jsonpath='{.status.podIP}')
echo "Zone A pod IP: $ZONE_A_IP"
# Confirm this is in the 10.244.0.0/18 range for Zone A
python3 -c "
import ipaddress
pod = ipaddress.ip_address('$ZONE_A_IP')
zone_a = ipaddress.ip_network('10.244.0.0/18')
print('In Zone A CIDR:', pod in zone_a)
"
```

## Step 4: Audit Legacy Firewall Rules for Static Pod IPs

Scan existing firewall rules to identify any that reference specific pod IPs.

```bash
# List current pod IPs
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort -u > current-pod-ips.txt

# Scan iptables rules for specific pod IPs (looking for rules that will break)
# In production, run this against your actual firewall rule export
iptables-save | grep -E "$(paste -sd'|' current-pod-ips.txt)" > static-ip-rules.txt

echo "Firewall rules with static pod IPs (need to be converted to CIDR rules):"
cat static-ip-rules.txt
```

## Best Practices

- Provide the firewall team with the complete list of Calico IPAM CIDRs (not individual pod IPs) when requesting firewall rules
- Use separate IP pools for different sensitivity levels so firewall rules can be applied at the pool CIDR granularity
- Run `calicoctl get ippools` and share the output with the firewall team before any new workload is onboarded
- Include pod IP range changes in your change management process — adding a new IP pool requires firewall rule updates
- Periodically scan firewall rules for static pod IPs that will break after pod restarts
- Document the complete set of Calico IPAM CIDRs in your network architecture documentation for firewall teams

## Conclusion

Testing Calico IPAM compatibility with legacy firewalls reveals the static-IP assumptions that will break when pod IPs change after restarts or rescheduling events. By demonstrating that CIDR-based rules provide reliable connectivity while static IP rules fail, you build the case for updating legacy firewall configurations before production workloads experience connectivity failures.
