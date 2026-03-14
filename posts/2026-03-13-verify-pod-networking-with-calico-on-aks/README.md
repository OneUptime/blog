# How to Verify Pod Networking with Calico on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, AKS, Azure

Description: Learn how to verify Calico network policy enforcement is working correctly on Azure Kubernetes Service clusters.

---

## Introduction

Verifying Calico on AKS differs from self-managed Kubernetes because Calico runs in policy-only mode. Pod IP assignment is handled by Azure CNI, so Calico's IPAM verification steps do not apply. Instead, verification focuses on confirming that Felix is running and actively enforcing network policies.

On AKS, all pods receive IPs from the Azure virtual network address space (not from Calico IP pools). The key verifications are: Calico pods are running, Felix is processing NetworkPolicy resources, and network policies are being enforced correctly in practice. Pod-to-pod connectivity is always expected to work since Azure CNI handles routing.

This guide focuses on the AKS-specific verification steps for Calico policy enforcement.

## Prerequisites

- AKS cluster with `--network-policy calico` enabled
- kubectl with AKS cluster credentials
- calicoctl configured for the AKS cluster

## Step 1: Verify Calico Pods Are Running

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-kube-controllers
```

All should be `Running` with no excess restarts.

## Step 2: Check Calico DaemonSet

```bash
kubectl get daemonset calico-node -n kube-system
```

The `DESIRED`, `CURRENT`, and `READY` counts should all match the number of AKS nodes.

## Step 3: Inspect Felix Logs for Policy Processing

```bash
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50 | grep -i policy
```

Look for log entries showing Felix loading and applying network policies.

## Step 4: Deploy Test Pods

```bash
kubectl run test-a --image=busybox --restart=Never -- sleep 3600
kubectl run test-b --image=nginx --port=80
kubectl expose pod test-b --port=80 --name=test-b-svc
kubectl get pods -o wide
```

Note: Pod IPs will be from the Azure VNet CIDR, not from Calico IP pools.

## Step 5: Verify Pod-to-Pod Connectivity

```bash
TEST_B_IP=$(kubectl get pod test-b -o jsonpath='{.status.podIP}')
kubectl exec test-a -- ping -c 4 $TEST_B_IP
```

## Step 6: Test Service Discovery

```bash
kubectl exec test-a -- wget -qO- http://test-b-svc.default.svc.cluster.local
```

## Step 7: Verify Network Policy Enforcement

Apply a test policy and verify it is enforced:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-test
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: test-b
  policyTypes:
  - Ingress
EOF
```

```bash
kubectl exec test-a -- wget --timeout=5 -qO- http://test-b-svc
```

Should be denied, confirming Calico is enforcing policies on AKS.

## Step 8: Clean Up Test Policy

```bash
kubectl delete networkpolicy deny-all-test
```

## Conclusion

You have verified Calico policy enforcement on AKS by checking Felix health, pod connectivity, service discovery, and actual policy enforcement. The key distinction from self-managed Kubernetes is that verification focuses on Felix policy enforcement rather than IPAM or BGP, since Azure CNI handles networking at the IP level on AKS.
