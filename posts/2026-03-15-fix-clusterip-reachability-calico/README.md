# How to Fix ClusterIP Reachability Issues with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, ClusterIP, Networking, kube-proxy, iptables, Troubleshooting

Description: Practical fixes for ClusterIP service reachability failures in Kubernetes clusters using Calico as the CNI plugin.

---

## Introduction

Once you have diagnosed a ClusterIP reachability issue in a Calico-managed Kubernetes cluster, the next step is applying the correct fix. Common root causes include missing iptables rules, misconfigured kube-proxy, overly restrictive Calico network policies, and endpoint registration failures.

Each root cause requires a different remediation approach. Blindly restarting components may temporarily mask the issue without addressing the underlying problem. This guide covers targeted fixes for the most common ClusterIP failure scenarios.

The fixes are organized by root cause so you can jump directly to the relevant section after completing your diagnosis.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- `kubectl` and `calicoctl` CLI tools installed
- Root access to cluster nodes
- Diagnosis completed (see the companion diagnostic guide)
- Backup of existing network policies

## Fixing Missing or Corrupt iptables Rules

When kube-proxy iptables rules are missing or corrupted, ClusterIP traffic cannot be translated to pod IPs.

```bash
# Restart kube-proxy to regenerate iptables rules
kubectl rollout restart daemonset/kube-proxy -n kube-system

# Wait for rollout to complete
kubectl rollout status daemonset/kube-proxy -n kube-system

# Verify iptables rules are repopulated
sudo iptables -t nat -L KUBE-SERVICES -n | wc -l
```

If rules are still missing after restart, check the kube-proxy configuration:

```bash
# Edit the kube-proxy configmap
kubectl edit configmap kube-proxy -n kube-system

# Ensure clusterCIDR is set correctly
# Ensure mode is set (iptables or ipvs)
```

## Fixing Endpoint Registration Issues

Empty endpoints mean the service cannot route traffic to any pod.

```bash
# Check if the service selector matches pod labels
kubectl get svc <service-name> -n <namespace> -o jsonpath='{.spec.selector}'
kubectl get pods -n <namespace> --show-labels

# Fix mismatched selectors by patching the service
kubectl patch svc <service-name> -n <namespace> -p '{"spec":{"selector":{"app":"correct-label"}}}'

# If pods are not ready, check readiness probes
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Readiness"

# Fix a failing readiness probe
kubectl edit deployment <deployment-name> -n <namespace>
# Adjust readinessProbe path, port, or thresholds
```

## Fixing Calico Network Policy Blocks

Overly restrictive Calico policies can block ClusterIP traffic.

```bash
# Create a policy that allows ingress on the service port
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-clusterip-ingress
  namespace: <namespace>
spec:
  podSelector:
    matchLabels:
      app: <app-label>
  ingress:
  - ports:
    - protocol: TCP
      port: <service-port>
  policyTypes:
  - Ingress
EOF
```

For Calico-specific policies that need broader control:

```bash
# Create a Calico network policy allowing service traffic
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-service-traffic
  namespace: <namespace>
spec:
  selector: app == '<app-label>'
  ingress:
  - action: Allow
    protocol: TCP
    destination:
      ports:
      - <service-port>
  types:
  - Ingress
EOF
```

## Fixing kube-proxy Mode Issues

If kube-proxy is in the wrong mode for your cluster setup, switch it.

```bash
# Check current mode
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode

# Switch to ipvs mode if iptables mode has performance issues
kubectl edit configmap kube-proxy -n kube-system
# Set mode: "ipvs"

# Restart kube-proxy after config change
kubectl rollout restart daemonset/kube-proxy -n kube-system

# Verify ipvs rules are programmed
sudo ipvsadm -Ln | grep <cluster-ip>
```

## Fixing conntrack Table Exhaustion

A full conntrack table causes intermittent ClusterIP failures.

```bash
# Check current conntrack usage
sudo sysctl net.netfilter.nf_conntrack_count
sudo sysctl net.netfilter.nf_conntrack_max

# Increase conntrack table size
sudo sysctl -w net.netfilter.nf_conntrack_max=262144

# Make the change persistent
echo "net.netfilter.nf_conntrack_max=262144" | sudo tee -a /etc/sysctl.d/99-conntrack.conf
sudo sysctl --system

# Clear stale entries if needed
sudo conntrack -F
```

## Verification

After applying fixes, verify ClusterIP connectivity is restored:

```bash
# Test from a debug pod
kubectl run verify-fix --image=nicolaka/netshoot --rm -it -- \
  curl -s --connect-timeout 5 http://<service-name>.<namespace>.svc.cluster.local:<port>

# Verify endpoints are populated
kubectl get endpoints <service-name> -n <namespace>

# Check iptables rules exist
sudo iptables -t nat -L KUBE-SERVICES -n | grep <cluster-ip>
```

## Troubleshooting

- **Fix applied but issue persists**: Ensure changes have propagated to all nodes, not just the node you tested on.
- **kube-proxy restart causes brief outage**: This is expected. Rolling restarts minimize impact.
- **Policy changes not taking effect**: Check for higher-priority Calico GlobalNetworkPolicy rules that may override namespace-level policies.
- **conntrack flush drops active connections**: Schedule conntrack changes during maintenance windows.
- **IPVS mode not working**: Ensure ipvs kernel modules are loaded with `lsmod | grep ip_vs`.

## Conclusion

Fixing ClusterIP reachability issues in Calico clusters depends on accurately identifying the root cause. Whether it is missing iptables rules, mismatched service selectors, restrictive network policies, or conntrack exhaustion, each problem has a specific targeted fix. Always verify the fix from a pod inside the cluster and confirm that the resolution persists across kube-proxy restarts and node reboots.
