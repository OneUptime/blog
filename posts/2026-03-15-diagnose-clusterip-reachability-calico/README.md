# How to Diagnose ClusterIP Reachability Issues with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, ClusterIP, Networking, Troubleshooting, kube-proxy, iptables

Description: A step-by-step guide to diagnosing ClusterIP reachability issues in Kubernetes clusters running Calico as the CNI plugin.

---

## Introduction

ClusterIP services in Kubernetes provide stable virtual IP addresses for internal communication between pods. When these services become unreachable, applications experience connection timeouts, DNS resolution failures, and cascading service outages. In clusters using Calico as the CNI plugin, ClusterIP issues can stem from iptables rule corruption, kube-proxy misconfiguration, or Calico policy interference.

Diagnosing these problems requires a systematic approach that examines each layer of the networking stack. You need to verify DNS resolution, check iptables NAT rules, inspect Calico network policies, and validate endpoint health. Skipping steps often leads to misdiagnosis and wasted time.

This guide walks through the complete diagnostic process for ClusterIP reachability failures in Calico-managed clusters, from initial symptom identification to root cause isolation.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- `kubectl` and `calicoctl` CLI tools installed
- Access to cluster nodes via SSH
- Basic understanding of Kubernetes services and networking
- Permissions to inspect iptables rules on nodes

## Identifying the Symptoms

Start by confirming the ClusterIP service is actually unreachable and not an application-level issue.

```bash
# Test ClusterIP connectivity from a debug pod
kubectl run debug-net --image=nicolaka/netshoot --rm -it -- bash

# Inside the pod, test the service
curl -v --connect-timeout 5 http://<cluster-ip>:<port>

# Verify DNS resolution
nslookup <service-name>.<namespace>.svc.cluster.local

# Test with wget as an alternative
wget -qO- --timeout=5 http://<service-name>.<namespace>.svc.cluster.local:<port>
```

## Checking Service and Endpoint Status

```bash
# Verify the service exists and has the correct ClusterIP
kubectl get svc <service-name> -n <namespace> -o wide

# Check that endpoints are populated
kubectl get endpoints <service-name> -n <namespace>

# Inspect endpoint slices for more detail
kubectl get endpointslices -n <namespace> -l kubernetes.io/service-name=<service-name> -o yaml

# Confirm backing pods are running and ready
kubectl get pods -n <namespace> -l <selector-label> -o wide
```

If the endpoints list is empty, the issue is not networking but rather that no pods match the service selector or the pods are not in a Ready state.

## Inspecting kube-proxy and iptables Rules

kube-proxy programs iptables rules that perform DNAT from the ClusterIP to pod IPs.

```bash
# SSH to a node and check iptables NAT rules for the service
sudo iptables -t nat -L KUBE-SERVICES -n | grep <cluster-ip>

# Trace the full chain for a specific service
sudo iptables -t nat -L KUBE-SVC-<hash> -n --line-numbers

# Check if kube-proxy is running and healthy
kubectl get pods -n kube-system -l k8s-app=kube-proxy
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50

# Verify kube-proxy mode
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode
```

## Examining Calico Network Policies

Calico network policies can silently block traffic to ClusterIP services.

```bash
# List all network policies in the namespace
kubectl get networkpolicy -n <namespace>
calicoctl get networkpolicy -n <namespace> -o yaml

# List global network policies
calicoctl get globalnetworkpolicy -o yaml

# Check Calico node status
sudo calicoctl node status

# Review Felix logs for denied packets
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 | grep -i deny
```

## Verifying IP Pool Configuration

```bash
# Check Calico IP pools
calicoctl get ippool -o yaml

# Ensure the pod CIDR matches the IP pool
kubectl cluster-info dump | grep -m 1 cluster-cidr

# Verify natOutgoing setting
calicoctl get ippool -o wide
```

## Packet-Level Debugging

When higher-level checks are inconclusive, capture packets on the node.

```bash
# Capture traffic destined for the ClusterIP on the node
sudo tcpdump -i any host <cluster-ip> -nn -c 50

# Check for DNAT translations
sudo conntrack -L -d <cluster-ip> 2>/dev/null

# Verify the traffic reaches the target pod interface
sudo tcpdump -i cali+ dst port <target-port> -nn -c 20
```

## Troubleshooting

- **Empty endpoints**: Check pod readiness probes and service selector labels match pod labels exactly.
- **iptables rules missing**: Restart kube-proxy pods and check for kube-proxy crash loops.
- **Calico policy denials**: Temporarily create an allow-all policy to confirm if policies are the cause, then narrow down.
- **conntrack table full**: Check `sudo sysctl net.netfilter.nf_conntrack_count` against `nf_conntrack_max` and increase if needed.
- **Intermittent failures**: Look for endpoint churn using `kubectl get events -n <namespace>` and check if pods are restarting frequently.

## Conclusion

Diagnosing ClusterIP reachability issues in Calico clusters requires checking multiple layers: service configuration, endpoint health, kube-proxy iptables rules, Calico network policies, and underlying packet flow. By following this systematic approach, you can isolate whether the problem is at the service definition layer, the kube-proxy NAT translation layer, or the Calico policy enforcement layer. Once the root cause is identified, targeted fixes can be applied without disrupting other cluster networking.
