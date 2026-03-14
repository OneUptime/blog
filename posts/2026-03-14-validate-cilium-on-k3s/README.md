# Validating Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s

Description: Learn how to thoroughly validate your Cilium installation on K3s, including connectivity tests, policy enforcement checks, and Hubble observability verification.

---

## Introduction

After installing Cilium on K3s, validation ensures that all networking components are functioning correctly before you deploy production workloads. A Cilium installation can appear healthy at the pod level while having subtle issues with routing, policy enforcement, or service load balancing.

Cilium provides built-in validation tools through the Cilium CLI that test connectivity, DNS resolution, network policy enforcement, and encryption. These tests exercise the complete networking stack rather than just checking if pods are running.

This guide covers both automated validation using the Cilium CLI and manual verification steps for specific K3s integration points.

## Prerequisites

- A K3s cluster with Cilium installed as the CNI
- The Cilium CLI installed (`cilium` command available)
- `kubectl` configured to access the K3s cluster
- At least two nodes for cross-node connectivity tests

## Running the Cilium Status Check

Start with the built-in status command that validates all Cilium components:

```bash
# Check overall Cilium status
cilium status

# Expected output should show:
#     /¯¯\
#  /¯¯\__/¯¯\    Cilium:          OK
#  \__/¯¯\__/    Operator:        OK
#  /¯¯\__/¯¯\    Hubble Relay:    OK
#  \__/¯¯\__/    ClusterMesh:     disabled
#     \__/
# ...
# Cluster Pods:     x/x managed by Cilium

# Check Cilium version and configuration
cilium config view | grep -E "enable|mode|tunnel"
```

## Running the Connectivity Test Suite

The Cilium connectivity test deploys test workloads and validates all networking paths:

```bash
# Run the full connectivity test suite
# This creates a cilium-test namespace with test pods
cilium connectivity test

# For a quicker subset of tests
cilium connectivity test --test pod-to-pod
cilium connectivity test --test pod-to-service
cilium connectivity test --test dns-resolution

# The test suite validates:
# - Pod-to-pod connectivity (same node and cross-node)
# - Pod-to-service connectivity
# - Pod-to-external connectivity
# - DNS resolution
# - Network policy enforcement
# - Encryption (if enabled)
```

## Validating K3s-Specific Integration Points

Verify Cilium integrates correctly with K3s components:

```bash
# Check that CoreDNS is running and reachable through Cilium
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide
kubectl run dns-test --image=busybox --restart=Never -- nslookup kubernetes.default
kubectl wait --for=condition=Ready pod/dns-test --timeout=30s
kubectl logs dns-test
kubectl delete pod dns-test

# Verify kube-proxy replacement is working (if enabled)
cilium status | grep "KubeProxyReplacement"

# Check that services are accessible
kubectl get svc kubernetes
kubectl run svc-test --image=busybox --restart=Never -- wget -qO- --timeout=5 https://kubernetes.default.svc:443 2>&1
kubectl logs svc-test 2>/dev/null
kubectl delete pod svc-test

# Verify Cilium is managing all pods
cilium status | grep "managed by Cilium"
```

## Validating Network Policy Enforcement

Test that Cilium correctly enforces network policies:

```yaml
# policy-test.yaml
# Creates test pods and a network policy to verify enforcement
apiVersion: v1
kind: Namespace
metadata:
  name: policy-validation
---
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  namespace: policy-validation
  labels:
    app: web
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: allowed-client
  namespace: policy-validation
  labels:
    role: allowed
spec:
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
---
apiVersion: v1
kind: Pod
metadata:
  name: denied-client
  namespace: policy-validation
  labels:
    role: denied
spec:
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-only-allowed
  namespace: policy-validation
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: allowed
      ports:
        - port: 80
```

```bash
# Apply and test
kubectl apply -f policy-test.yaml
kubectl wait --for=condition=Ready pod/web-server pod/allowed-client pod/denied-client \
  -n policy-validation --timeout=60s

WEB_IP=$(kubectl get pod web-server -n policy-validation -o jsonpath='{.status.podIP}')

# This should succeed (allowed client)
kubectl exec -n policy-validation allowed-client -- wget -qO- --timeout=5 http://$WEB_IP
echo "Allowed client: $?"

# This should fail/timeout (denied client)
kubectl exec -n policy-validation denied-client -- wget -qO- --timeout=5 http://$WEB_IP 2>&1
echo "Denied client: $? (expected non-zero)"

# Cleanup
kubectl delete namespace policy-validation
```

## Verification

Final comprehensive validation checklist:

```bash
echo "=== Cilium on K3s Validation Summary ==="

# 1. Cilium components healthy
echo "1. Cilium Status:"
cilium status --output json | python3 -c "
import sys, json
status = json.load(sys.stdin)
print(f'   Cilium Agent: {status.get(\"cilium\", {}).get(\"state\", \"unknown\")}')
print(f'   Operator: {status.get(\"operator\", {}).get(\"state\", \"unknown\")}')
"

# 2. All nodes ready
echo "2. Nodes:"
kubectl get nodes --no-headers | awk '{print "   " $1 ": " $2}'

# 3. All Cilium pods running
echo "3. Cilium Pods:"
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium --no-headers | \
  awk '{print "   " $1 ": " $3}'

# 4. Pod networking functional
echo "4. Pod Network Test:"
kubectl run val-test --image=nginx --restart=Never 2>/dev/null
kubectl wait --for=condition=Ready pod/val-test --timeout=30s 2>/dev/null
echo "   Pod created and ready: OK"
kubectl delete pod val-test 2>/dev/null
```

## Troubleshooting

- **Connectivity test hangs on pod-to-world tests**: K3s may have restrictive outbound rules. Skip external tests with `cilium connectivity test --test '!to-outside'`.
- **Network policy test shows both clients can connect**: Ensure the policy was applied correctly with `kubectl get networkpolicy -n policy-validation -o yaml`. Cilium may take a few seconds to enforce new policies.
- **DNS resolution fails intermittently**: Check if CoreDNS pods have been restarted after Cilium was installed. Restart CoreDNS with `kubectl rollout restart deployment coredns -n kube-system`.
- **`cilium status` shows warnings about BPF**: Verify your kernel version supports eBPF with `uname -r`. K3s on older kernels (< 4.19) may not support all Cilium features.

## Conclusion

Validating Cilium on K3s requires checking component health, running the connectivity test suite, verifying K3s-specific integration points like CoreDNS and kube-proxy replacement, and testing network policy enforcement. The Cilium CLI provides comprehensive automated tests, but manual verification of K3s integration points ensures the complete stack is functioning correctly.
