# Validate Service CIDR Reachability with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Services, CIDR, Networking

Description: Learn how to validate that Kubernetes service ClusterIP addresses are reachable from pods and nodes in a Calico-managed cluster, and troubleshoot common service CIDR routing failures.

---

## Introduction

Kubernetes services use ClusterIP addresses drawn from the service CIDR — a separate IP range from the pod CIDR. Unlike pod IPs, ClusterIP addresses are virtual; they exist only in iptables or eBPF rules and are never assigned to actual network interfaces. This means routing service IPs requires kube-proxy or Calico's eBPF dataplane to intercept and translate traffic.

When service CIDR reachability breaks, pods cannot reach other services via their ClusterIP addresses, causing application-level failures that appear as DNS resolution succeeding but connections failing. This is distinct from pod-to-pod connectivity issues and requires a different diagnostic approach.

This guide covers validation of service CIDR reachability in Calico-managed clusters, including inspection of iptables rules and Calico eBPF service maps.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI configured
- `kubectl` with cluster admin access
- Understanding of the cluster's service CIDR range

## Step 1: Identify the Service CIDR

Confirm the service CIDR configured in the cluster.

```bash
# Get the service CIDR from kube-apiserver configuration
kubectl cluster-info dump | grep -m1 "service-cluster-ip-range"

# Alternative: check via kube-controller-manager
kubectl get cm -n kube-system kubeadm-config -o yaml | grep serviceSubnet

# List all services to see the ClusterIP range in use
kubectl get services --all-namespaces | grep -v None | awk '{print $4}' | sort
```

## Step 2: Test Service Reachability from a Pod

Verify that pods can reach services via ClusterIP.

```bash
# Get the Kubernetes API service ClusterIP
KUBE_SVC_IP=$(kubectl get svc kubernetes -n default -o jsonpath='{.spec.clusterIP}')
echo "Kubernetes service IP: $KUBE_SVC_IP"

# Test connectivity to the Kubernetes API service from a pod
kubectl run svc-test --image=busybox:1.28 --restart=Never -- sleep 3600
kubectl exec svc-test -- wget -q -O- --timeout=5 https://$KUBE_SVC_IP

# Test a regular ClusterIP service
kubectl exec svc-test -- nc -zv <service-clusterip> <port>
```

## Step 3: Inspect iptables Rules for Service Translation

Verify that kube-proxy has created the correct iptables DNAT rules for services.

```bash
# Check KUBE-SERVICES iptables chain on a node
kubectl debug node/<node-name> -it --image=ubuntu -- iptables -t nat -L KUBE-SERVICES -n

# Find the specific rules for a service ClusterIP
SVC_IP=<service-clusterip>
kubectl debug node/<node-name> -it --image=ubuntu -- iptables -t nat -L -n | grep $SVC_IP

# Verify KUBE-POSTROUTING rules for masquerade
kubectl debug node/<node-name> -it --image=ubuntu -- iptables -t nat -L KUBE-POSTROUTING -n
```

## Step 4: Validate Calico Does Not Block Service CIDR Traffic

Check that Calico network policies allow egress to the service CIDR.

```bash
# List GlobalNetworkPolicies that might affect service traffic
calicoctl get globalnetworkpolicy -o wide

# Check if any policy has a deny rule for the service CIDR range
SERVICE_CIDR="10.96.0.0/12"
calicoctl get globalnetworkpolicy -o yaml | grep -A10 "$SERVICE_CIDR"

# Ensure there is no default-deny policy blocking service IP egress
calicoctl get globalnetworkpolicy -o yaml | grep -B5 "action: Deny"
```

## Step 5: Validate Service CIDR in Calico Configuration

Ensure Calico is not treating the service CIDR as a pod IP pool or routing it incorrectly.

```bash
# Check that the service CIDR is not accidentally in a Calico IP pool
calicoctl get ippool -o wide

# Verify Calico Felix knows about the service CIDR
kubectl get cm -n kube-system calico-config -o yaml | grep -i "service\|cluster"

# Check that routes to the service CIDR are handled by kube-proxy, not BGP
kubectl debug node/<node-name> -it --image=busybox -- ip route show | grep <service-cidr>
```

## Best Practices

- Document the service CIDR alongside the pod CIDR in your cluster infrastructure records
- Ensure service and pod CIDRs do not overlap with each other or with existing network ranges
- In default-deny policy configurations, always test service reachability after applying policies
- Monitor kube-proxy pod health — service CIDR failures are often caused by kube-proxy failures
- If using Calico eBPF mode, validate service maps rather than iptables rules

## Conclusion

Service CIDR reachability is foundational to Kubernetes application networking. When pods cannot reach ClusterIP services, applications fail in ways that can be confused with DNS or application errors. By validating the service CIDR configuration, iptables rules, and Calico policy interactions, you can quickly diagnose and resolve service reachability issues. Include service connectivity tests in your cluster validation suite alongside pod-to-pod tests.
