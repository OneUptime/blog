# How to Verify Pod Networking with Calico on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, EKS, AWS

Description: Learn how to verify Calico network policy enforcement and pod networking on Amazon EKS clusters.

---

## Introduction

Verifying Calico on EKS focuses on confirming that pod networking via AWS VPC CNI is operational and that Calico's policy enforcement is active. Since EKS with Calico in policy-only mode relies on two separate components - AWS VPC CNI for IP assignment and Calico Felix for policy enforcement - both must be verified independently.

On EKS, pod IPs come from the VPC subnet range rather than from Calico IP pools. This means calicoctl's `ipam show` command will not show pod IP allocation as it would on self-managed clusters. Instead, verification focuses on Felix running correctly, network policies being loaded, and connectivity tests confirming that pod-to-pod communication works and policies are enforced.

## Prerequisites

- EKS cluster with Calico installed
- kubectl configured (`aws eks update-kubeconfig`)
- calicoctl installed

## Step 1: Verify Calico Pods Are Running

```bash
kubectl get pods -n calico-system
kubectl get pods -n kube-system | grep calico
kubectl get pods -n tigera-operator 2>/dev/null
```

## Step 2: Check Tigera Status (Operator Installation)

```bash
kubectl get tigerastatus
```

All components should show `Available: True`.

## Step 3: Check AWS VPC CNI Pods

```bash
kubectl get pods -n kube-system -l k8s-app=aws-node
```

Both AWS VPC CNI and Calico must be running for pod networking to work on EKS.

## Step 4: Verify Nodes Are Ready

```bash
kubectl get nodes -o wide
```

All nodes should show `Ready`. The node IPs will be from the VPC subnet range.

## Step 5: Check Calico Node Status

```bash
calicoctl node status
```

On EKS in policy-only mode, BGP is not used. Felix should show as running.

## Step 6: Deploy Test Pods

```bash
kubectl run pod-a --image=busybox --restart=Never -- sleep 3600
kubectl run pod-b --image=nginx --port=80
kubectl expose pod pod-b --port=80 --name=pod-b-svc
kubectl get pods -o wide
```

Pod IPs will be VPC subnet IPs (e.g., `10.0.x.x`).

## Step 7: Test Pod Connectivity

```bash
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 4 $POD_B_IP
kubectl exec pod-a -- wget -qO- http://pod-b-svc.default.svc.cluster.local
```

## Step 8: Verify Network Policy Enforcement

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-pod-b-ingress
spec:
  podSelector:
    matchLabels:
      run: pod-b
  policyTypes:
  - Ingress
EOF

kubectl exec pod-a -- wget --timeout=5 -qO- http://pod-b-svc
```

Should time out, confirming Calico is enforcing policies on EKS.

```bash
kubectl delete networkpolicy deny-pod-b-ingress
```

## Step 9: Verify External Egress

```bash
kubectl exec pod-a -- wget -qO- https://api.ipify.org
```

## Conclusion

You have verified Calico on EKS by checking Calico pods, AWS VPC CNI pods, node status, pod connectivity, and network policy enforcement. The dual-component architecture of AWS VPC CNI plus Calico Felix requires both to be healthy for complete pod networking with policy enforcement on EKS.
