# Monitor IPv6 Control Plane with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPv6, Control Plane, Kubernetes, Networking, Monitoring, BGP

Description: Learn how to monitor the IPv6 control plane in Calico, including BGP session health for IPv6 peers, IPv6 route propagation, and detecting IPv6-specific routing failures.

---

## Introduction

As Kubernetes clusters increasingly adopt IPv6 or dual-stack networking, monitoring the IPv6 control plane becomes essential. Calico's IPv6 support includes IPv6 BGP peering, IPv6 IP pools, IPv6 route propagation through Felix, and IPv6 network policy enforcement. Issues in the IPv6 control plane often remain undetected longer than IPv4 issues because most monitoring tools default to IPv4.

The IPv6 control plane in Calico involves multiple components: BGP sessions over IPv6 between nodes (or to external routers), IPv6 route installation in the Linux kernel's IPv6 routing table, and Felix's IPv6 firewall rules. Monitoring each of these layers ensures that IPv6 pod connectivity is reliable alongside IPv4.

This guide covers monitoring the Calico IPv6 control plane, validating IPv6 BGP sessions, checking IPv6 route propagation, and alerting on IPv6-specific failures.

## Prerequisites

- Kubernetes cluster with Calico v3.23+ and IPv6 or dual-stack enabled
- Nodes with IPv6 addresses on their primary interfaces
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- Understanding of IPv6 addressing and BGP for IPv6 (AFI/SAFI 2/1)

## Step 1: Verify IPv6 Control Plane Components

Confirm that Calico's IPv6 components are active and configured correctly.

Check IPv6 configuration in Calico's installation and Felix:

```bash
# Verify IPv6 is enabled in the Calico installation
kubectl get installation default -o yaml | grep -A5 "ipv6"

# Check FelixConfiguration for IPv6 settings
calicoctl get felixconfiguration default -o yaml | grep -i "ipv6\|IPv6"

# Verify nodes have IPv6 addresses assigned by Calico
calicoctl get nodes -o yaml | grep -E "ipv6Address:|bgp:" -A2

# Check that IPv6 IP pools are active
calicoctl get ippools -o wide | grep -v "10\.\|172\.\|192\."  # Show only IPv6 pools
```

## Step 2: Monitor IPv6 BGP Sessions

Check BGP session health for IPv6 address family.

Verify IPv6 BGP peering status using BIRD2 (Calico's BGP daemon):

```bash
# Check BGP session status including IPv6 peers
calicoctl node status

# Get detailed BGP session status from BIRD
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- birdcl show protocols all | grep -A10 "ipv6\|Established\|Active"

# Check IPv6 BGP peer configuration
calicoctl get bgppeers -o yaml | grep -E "peerIP:|asNumber:" | grep ":"  # IPv6 peers have colons
```

## Step 3: Validate IPv6 Route Propagation

Verify that IPv6 pod routes are being distributed correctly across nodes.

Check the IPv6 routing table on nodes for pod routes:

```bash
# Check IPv6 routing table on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip -6 route show | head -30

# Verify pod CIDRs are in the IPv6 routing table
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ip -6 route show | grep "fd00:"  # Replace with your IPv6 pod CIDR

# Check BIRD routing table for IPv6 routes
kubectl exec -n calico-system \
  $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- birdcl show route protocol kernel6 | head -20
```

## Step 4: Test IPv6 Pod Connectivity

Validate end-to-end IPv6 connectivity between pods.

Run IPv6 connectivity tests between pods on different nodes:

```bash
# Create test pods on different nodes
kubectl run ipv6-test-1 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<node-1>"}}' -- sleep 3600

kubectl run ipv6-test-2 --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<node-2>"}}' -- sleep 3600

# Get IPv6 addresses
POD1_IPV6=$(kubectl get pod ipv6-test-1 -o jsonpath='{.status.podIPs[1].ip}')
POD2_IPV6=$(kubectl get pod ipv6-test-2 -o jsonpath='{.status.podIPs[1].ip}')

echo "Pod1 IPv6: $POD1_IPV6"
echo "Pod2 IPv6: $POD2_IPV6"

# Test cross-node IPv6 connectivity
kubectl exec ipv6-test-1 -- ping6 -c4 $POD2_IPV6
kubectl exec ipv6-test-2 -- ping6 -c4 $POD1_IPV6
```

## Step 5: Create IPv6 Control Plane Alerts

Set up Prometheus alerts specific to IPv6 control plane health.

Configure alerting rules for IPv6-specific failures:

```yaml
# ipv6-controlplane-alerts.yaml - Prometheus alerts for IPv6 control plane
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ipv6-controlplane
  namespace: monitoring
spec:
  groups:
  - name: calico-ipv6
    rules:
    - alert: CalicoIPv6BGPSessionDown
      # Alert if any IPv6 BGP session goes down
      expr: |
        felix_bgp_num_node_to_node_peers_established_total < 
        felix_bgp_num_node_to_node_peers_total
      for: 3m
      labels:
        severity: critical
        address_family: ipv6
      annotations:
        summary: "One or more IPv6 BGP sessions are not established"
    - alert: CalicoIPv6RouteInstallFailed
      expr: |
        rate(felix_ipset_errors_total[5m]) > 0
      for: 2m
      labels:
        severity: warning
        address_family: ipv6
      annotations:
        summary: "Calico Felix IPv6 route installation failures detected"
```

Apply the IPv6 alerts:

```bash
kubectl apply -f ipv6-controlplane-alerts.yaml
```

## Best Practices

- Always test IPv6 connectivity explicitly after cluster upgrades since IPv6 regressions can be invisible in IPv4-first monitoring
- Monitor BIRD6 (IPv6 BGP daemon) separately from BIRD4 since they can fail independently
- Use Hubble to observe IPv6 flows in addition to IPv4 flows for complete dual-stack visibility
- Ensure your monitoring infrastructure (Prometheus, Grafana) is accessible via IPv6 to avoid monitoring blind spots
- Configure OneUptime monitors targeting IPv6 endpoints of critical services to validate IPv6 reachability

## Conclusion

The IPv6 control plane in Calico requires dedicated monitoring attention because IPv6 failures often go undetected when monitoring is focused on IPv4. By verifying IPv6 BGP sessions, route propagation, and pod connectivity independently from IPv4, and setting up IPv6-specific alerts, you can maintain reliable dual-stack networking across your cluster. Use OneUptime to monitor IPv6-specific service endpoints as the final validation that your IPv6 control plane is functioning correctly for users.
