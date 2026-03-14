# How to Verify Flannel with Calico Network Policy Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Flannel, Canal, Kubernetes, Networking, Verification, Production

Description: A guide to verifying that Canal (Flannel + Calico network policy) is correctly configured and policy-enforcing before promoting a cluster to production.

---

## Introduction

Before promoting a Canal cluster to production, verifying both the Flannel networking layer and the Calico policy enforcement layer independently ensures that failures are attributed to the correct component. A cluster might have healthy Flannel routing but misconfigured Felix policy enforcement, or vice versa. Running a structured verification sequence catches both categories of issue.

The verification sequence covers: pod networking reachability, NetworkPolicy enforcement, Felix health, Flannel subnet allocation, and policy consistency across nodes.

## Prerequisites

- Canal installed (Flannel + Calico network policy)
- `kubectl` access to the cluster
- At least two worker nodes for cross-node testing

## Step 1: Verify Canal DaemonSet Health

```bash
kubectl get daemonset canal -n kube-system
kubectl get pods -n kube-system -l k8s-app=canal -o wide
```

All pods should show `2/2` containers running (flannel + calico-node).

## Step 2: Confirm Flannel Subnet Allocation

Each node should have a Flannel subnet annotation.

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

Each node should have a unique `/24` (or configured block size) subnet.

## Step 3: Test Cross-Node Pod Connectivity

Deploy pods on different nodes and test connectivity.

```bash
NODE1=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
NODE2=$(kubectl get nodes -o jsonpath='{.items[1].metadata.name}')

kubectl run pod-a --image=busybox --restart=Never --overrides="{\"spec\":{\"nodeName\":\"$NODE1\"}}" -- sleep 3600
kubectl run pod-b --image=busybox --restart=Never --overrides="{\"spec\":{\"nodeName\":\"$NODE2\"}}" -- sleep 3600

kubectl wait --for=condition=Ready pod/pod-a pod/pod-b --timeout=60s
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c5 $POD_B_IP
```

Cross-node ping confirms Flannel VXLAN encapsulation is working.

## Step 4: Verify NetworkPolicy Enforcement

Apply an ingress deny policy and confirm Felix enforces it.

```bash
kubectl label pod pod-b env=isolated

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-pod-b
  namespace: default
spec:
  podSelector:
    matchLabels:
      env: isolated
  policyTypes: [Ingress]
EOF

# Ping should now fail
kubectl exec pod-a -- ping -c3 $POD_B_IP && echo "FAIL: traffic not blocked" || echo "PASS: traffic blocked"
kubectl delete networkpolicy isolate-pod-b
```

## Step 5: Confirm Felix Is Programming Rules

On a worker node, verify Felix has written iptables rules.

```bash
kubectl debug node/<node-name> -it --image=busybox -- /bin/sh
# Inside the debug pod:
chroot /host iptables -L | grep cali | head -20
```

## Step 6: Check Calico Workload Endpoints

```bash
kubectl exec -n kube-system deploy/calicoctl -- calicoctl get workloadendpoints -A | head -20
```

Every running pod should have a corresponding workload endpoint entry.

## Step 7: Verify DNS Resolution

```bash
kubectl exec pod-a -- nslookup kubernetes.default.svc.cluster.local
```

DNS confirms kube-dns is reachable over the Flannel network.

## Conclusion

Pre-production verification of a Canal cluster covers cross-node VXLAN connectivity (Flannel layer), NetworkPolicy enforcement (Calico Felix layer), iptables rule programming, workload endpoint registration, and DNS functionality. Separating the verification steps by layer makes it easier to isolate whether a failure belongs to Flannel routing or Calico policy enforcement - two distinct components that Canal combines into a single DaemonSet.
