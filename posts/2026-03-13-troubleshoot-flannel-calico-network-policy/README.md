# How to Troubleshoot Flannel with Calico Network Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Flannel, Canal, Kubernetes, Networking, Troubleshooting, Network Policy

Description: A guide to diagnosing and resolving common issues with Canal (Flannel + Calico network policy) clusters.

---

## Introduction

Troubleshooting Canal requires distinguishing between failures in the Flannel networking layer and failures in the Calico policy enforcement layer. A pod that can't reach another pod may have a routing issue (Flannel) or a policy issue (Calico Felix). A policy that appears not to apply could be a Felix programming failure or a pod selector mismatch. Separating symptoms by layer is the first step in effective Canal troubleshooting.

## Common Issues and Diagnostic Steps

### Issue 1: Pods Stuck in ContainerCreating

This usually indicates a CNI failure, not a policy issue.

```bash
kubectl describe pod <pod-name> | grep -A5 "Events:"
```

Look for `failed to set up network` errors. Check Canal pod logs.

```bash
kubectl logs -n kube-system -l k8s-app=canal -c canal --tail=50
```

If Flannel can't allocate a subnet, check node annotations.

```bash
kubectl get node <node-name> -o jsonpath='{.metadata.annotations}' | python3 -m json.tool | grep flannel
```

### Issue 2: Cross-Node Pod Connectivity Failure

Flannel uses VXLAN by default. Check that VXLAN traffic is permitted.

```bash
# On a node, check flannel.1 interface
ip link show flannel.1
ip route show | grep flannel

# Check for VXLAN traffic (UDP 8472)
ss -ulnp | grep 8472
```

If `flannel.1` is missing, the Flannel component in the Canal pod is not running.

```bash
kubectl logs -n kube-system <canal-pod> -c flannel
```

### Issue 3: NetworkPolicy Not Being Enforced

First confirm Felix is running and healthy.

```bash
kubectl exec -n kube-system <canal-pod> -c calico-node -- calico-node -version
kubectl logs -n kube-system <canal-pod> -c calico-node | grep -i "error\|warn\|policy"
```

Check that the workload endpoint for the target pod exists.

```bash
kubectl exec -n kube-system deploy/calicoctl -- calicoctl get workloadendpoint -A | grep <pod-name>
```

If the workload endpoint is missing, Felix has not registered the pod. Restart the Canal DaemonSet pod on that node.

```bash
kubectl delete pod -n kube-system <canal-pod-on-node>
```

### Issue 4: Policy Selector Not Matching

Verify pod labels match the NetworkPolicy selector.

```bash
kubectl get pod <pod-name> --show-labels
kubectl get networkpolicy <policy-name> -o yaml | grep -A5 podSelector
```

### Issue 5: Felix Reporting Errors

```bash
kubectl logs -n kube-system -l k8s-app=canal -c calico-node | grep -i "error" | tail -20
```

Check Felix configuration.

```bash
kubectl exec -n kube-system deploy/calicoctl -- calicoctl get felixconfiguration -o yaml
```

### Issue 6: Verify iptables Rules Are Present

On the affected node:

```bash
kubectl debug node/<node-name> -it --image=busybox -- /bin/sh
chroot /host iptables -L cali-INPUT | head -20
```

Missing `cali-` chains indicate Felix has not programmed rules on that node.

## Step-by-Step Diagnostic Flow

```plaintext
Pod connectivity failure
  └─ Check flannel.1 interface + VXLAN routes (Flannel layer)
       └─ OK? → Check NetworkPolicy selectors (policy layer)
            └─ Selectors correct? → Check Felix workload endpoint
                 └─ Missing endpoint? → Restart Canal pod on node
```

## Conclusion

Canal troubleshooting requires separating Flannel routing failures from Calico Felix policy failures. Routing issues manifest as connectivity failures before any policy is applied and show up as missing VXLAN interfaces or routes. Policy failures manifest as unexpected blocks or passes and are diagnosed by checking Felix logs, workload endpoint registration, and iptables rule programming. Addressing each layer independently reduces diagnostic time significantly.
