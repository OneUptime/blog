# Validate Cilium with Broadcom NSX

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, EBPF

Description: A guide to validating Cilium integration with Broadcom NSX, including verifying CNI chaining configuration, policy enforcement, and connectivity between Kubernetes pods and NSX-managed workloads.

---

## Introduction

Broadcom NSX is an enterprise network virtualization platform widely used in VMware-based private cloud environments. When running Kubernetes on NSX-managed infrastructure, Cilium can be deployed in a chained CNI mode alongside the NSX Container Plugin (NCP), providing Cilium's eBPF-based policy enforcement and observability while NSX handles overlay networking and micro-segmentation.

Validating this integration requires checking that the NCP and Cilium CNI plugins coexist correctly, that Cilium is enforcing Kubernetes network policies at the pod level, and that traffic between pods and NSX-managed workloads flows as expected. This is a nuanced validation because two networking control planes are active simultaneously.

This guide provides practical validation steps for the Cilium + NSX deployment pattern, helping platform engineers confirm correct behavior in enterprise VMware environments.

## Prerequisites

- Kubernetes cluster running on NSX-managed infrastructure (vSphere with NSX-T or NSX 4.x)
- NSX Container Plugin (NCP) deployed as the primary CNI
- Cilium deployed in CNI chaining mode
- `kubectl` cluster-admin access
- `cilium` CLI installed

## Step 1: Verify CNI Chaining Configuration

Confirm the CNI configuration file on nodes shows NCP as primary and Cilium as chained.

```bash
# Check the CNI configuration directory on a node
# The conflist should show NCP plugin first, followed by Cilium
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cat /host/etc/cni/net.d/05-nsx.conflist | python3 -m json.tool

# Confirm Cilium's chaining mode configuration
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.cni-chaining-mode}'
```

## Step 2: Check Cilium Agent and NCP Health

Both the NCP pods and Cilium DaemonSet must be running without errors.

```bash
# Check NCP pod status
kubectl -n nsx-system get pods

# Check Cilium DaemonSet status
kubectl -n kube-system get pods -l k8s-app=cilium

# Get Cilium overall health
cilium status
```

## Step 3: Validate Network Policy Enforcement

Apply a test policy and confirm Cilium enforces it while NCP handles routing.

```yaml
# nsx-cilium-test-policy.yaml - allow only specific ingress via Cilium
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-ingress
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
```

```bash
# Apply the policy
kubectl apply -f nsx-cilium-test-policy.yaml

# Verify Cilium has loaded the policy
cilium policy get | grep allow-specific-ingress
```

## Step 4: Test Pod-to-Pod Connectivity via NSX Overlay

```bash
# Deploy test pods
kubectl run frontend --image=nicolaka/netshoot --labels="app=frontend" -- sleep 3600
kubectl run backend --image=nginx --labels="app=backend"

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod/frontend pod/backend

# Test allowed connection (frontend -> backend)
BACKEND_IP=$(kubectl get pod backend -o jsonpath='{.status.podIP}')
kubectl exec frontend -- curl -m 5 http://$BACKEND_IP

# Test denied connection (from an unlabeled pod)
kubectl run other --image=nicolaka/netshoot -- sleep 3600
kubectl exec other -- curl -m 3 http://$BACKEND_IP  # Should timeout/be rejected
```

## Step 5: Check NSX Segment and Cilium Endpoint Alignment

```bash
# Verify Cilium endpoints are registered with correct IPs
kubectl get ciliumendpoints -n default

# Confirm pod IPs match NSX-assigned IPs from the NCP overlay
kubectl get pods -o wide
```

## Best Practices

- Ensure Cilium and NCP versions are compatible before upgrading either component
- Use `CiliumNetworkPolicy` for L7 policies; use standard `NetworkPolicy` for L3/L4 when NCP also enforces
- Monitor both NCP and Cilium logs separately to correlate issues at the correct layer
- Periodically run `cilium connectivity test` to detect regressions after NSX changes
- Document which policies are enforced at the NSX micro-segmentation layer vs. Cilium layer

## Conclusion

Validating Cilium with Broadcom NSX requires checking both networking layers independently and confirming that their coexistence does not create policy conflicts or routing issues. When correctly configured, Cilium provides eBPF-based policy enforcement and observability that complements NSX's micro-segmentation and overlay networking capabilities in enterprise VMware environments.
