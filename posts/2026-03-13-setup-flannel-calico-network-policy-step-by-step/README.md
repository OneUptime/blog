# How to Set Up Flannel with Calico Network Policy Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Flannel, Canal, Kubernetes, Networking, Network Policy, CNI

Description: A step-by-step guide to installing Canal — Flannel for pod networking combined with Calico for network policy enforcement.

---

## Introduction

Canal combines Flannel's simple VXLAN-based pod networking with Calico's rich network policy engine. Flannel handles the overlay network that gives each pod an IP address and enables pod-to-pod communication. Calico's Felix runs alongside and enforces NetworkPolicy objects on each node's iptables or nftables rules. The result is a cluster that uses Flannel's battle-tested networking without sacrificing Kubernetes NetworkPolicy support.

Canal is well-suited for clusters where Flannel is already in use and adding network policy is the goal, or for new clusters where a simple CNI choice is preferred but policy enforcement is required.

## Prerequisites

- Kubernetes cluster (kubeadm, k3s, or RKE-based)
- `kubectl` configured to access the cluster
- No CNI installed yet (for fresh installs)

## Step 1: Download the Canal Manifest

Canal is maintained by the Calico project as a combined manifest.

```bash
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml
```

## Step 2: Configure the Pod CIDR

Edit the manifest to match your cluster's pod CIDR. The default is `10.244.0.0/16`.

```bash
# If your cluster uses a different CIDR, update it
sed -i 's|10.244.0.0/16|<your-pod-cidr>|g' canal.yaml
```

Confirm the kubeadm pod CIDR matches.

```bash
kubectl cluster-info dump | grep -m1 cluster-cidr
```

## Step 3: Apply the Canal Manifest

```bash
kubectl apply -f canal.yaml
```

## Step 4: Verify Canal DaemonSet

```bash
kubectl get daemonset -n kube-system | grep -E "canal|calico|flannel"
kubectl get pods -n kube-system -l k8s-app=canal
```

All Canal pods should reach `Running` status. Each pod contains both the `flannel` and `calico-node` (Felix) containers.

## Step 5: Confirm Nodes Are Ready

```bash
kubectl get nodes
```

Nodes transition from `NotReady` to `Ready` once Canal assigns pod CIDRs and programs iptables rules.

## Step 6: Verify Pod-to-Pod Connectivity

```bash
kubectl run test-a --image=busybox --restart=Never -- sleep 3600
kubectl run test-b --image=busybox --restart=Never -- sleep 3600
POD_B_IP=$(kubectl get pod test-b -o jsonpath='{.status.podIP}')
kubectl exec test-a -- ping -c3 $POD_B_IP
```

## Step 7: Apply a Test NetworkPolicy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF
```

After applying, `test-a` should no longer be able to ping `test-b` (policy is enforced by Calico's Felix, not Flannel).

```bash
kubectl exec test-a -- ping -c3 $POD_B_IP || echo "Blocked by Calico policy"
kubectl delete networkpolicy deny-all-ingress
kubectl delete pod test-a test-b
```

## Step 8: Check calicoctl Node Status

```bash
# Install calicoctl if needed
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calicoctl.yaml
kubectl exec -n kube-system deploy/calicoctl -- calicoctl node status
```

## Conclusion

Setting up Canal gives a Kubernetes cluster both Flannel's reliable VXLAN networking and Calico's NetworkPolicy enforcement through a single manifest deployment. The Canal DaemonSet runs both components on every node, and the separation of responsibilities — Flannel for routing, Calico's Felix for policy — means each component can be tuned independently. Network policy applied after installation takes effect immediately, with no disruption to existing pod connectivity.
