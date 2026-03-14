# How to Verify Pod Networking with Calico with Helm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, Helm, CNI

Description: Learn how to verify Calico pod networking is fully operational after a Helm-based installation on Kubernetes.

---

## Introduction

After installing Calico via Helm with the Tigera Operator, verification must cover both the Operator's health and the Calico networking components it manages. The Helm installation introduces additional components — the Tigera Operator and Calico's APIServer — that are not present in the manifest-based installation, and these must be verified in addition to the standard Calico checks.

The Tigera Operator provides a `tigerastatus` CRD that gives a unified view of Calico component health. This is the primary verification resource for Helm-based Calico installations. Alongside this, standard pod connectivity checks and calicoctl status queries confirm that networking is operational end-to-end.

This guide provides a comprehensive verification process for Calico installed via Helm with the Tigera Operator.

## Prerequisites

- Calico installed via Helm with Tigera Operator
- kubectl and calicoctl configured
- Helm v3 installed

## Step 1: Check Helm Release Status

```bash
helm list -n tigera-operator
helm status calico -n tigera-operator
```

The release should show `STATUS: deployed`.

## Step 2: Verify Tigera Operator Pod

```bash
kubectl get pods -n tigera-operator
kubectl logs -n tigera-operator deployment/tigera-operator --tail=20
```

## Step 3: Check Tigera Status

```bash
kubectl get tigerastatus
```

All components should show `AVAILABLE: True` and `PROGRESSING: False`.

## Step 4: Verify Calico System Pods

```bash
kubectl get pods -n calico-system
```

Expect to see `calico-node`, `calico-typha`, and `calico-kube-controllers` all `Running`.

## Step 5: Check Installation CR Status

```bash
kubectl get installation default -o yaml | grep -A20 status
```

## Step 6: Deploy Test Pods

```bash
kubectl run pod-a --image=busybox --restart=Never -- sleep 3600
kubectl run pod-b --image=busybox --restart=Never -- sleep 3600
kubectl get pods -o wide
```

Verify pod IPs are from the configured IP pool CIDR.

## Step 7: Test Pod-to-Pod Connectivity

```bash
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 4 $POD_B_IP
```

## Step 8: Test Service Connectivity

```bash
kubectl run nginx --image=nginx --port=80
kubectl expose pod nginx --port=80 --name=nginx-svc
kubectl exec pod-a -- wget -qO- http://nginx-svc.default.svc.cluster.local
```

## Step 9: Verify IPAM

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

## Step 10: Check calicoctl Integration

```bash
calicoctl node status
calicoctl get ippool -o yaml
```

## Conclusion

You have verified Calico pod networking after a Helm-based installation, confirming that the Tigera Operator, Calico system pods, and networking data plane are all operational. The `tigerastatus` resource provides a convenient unified health view specific to the Helm/Operator installation method, while standard pod connectivity tests confirm end-to-end networking functionality.
