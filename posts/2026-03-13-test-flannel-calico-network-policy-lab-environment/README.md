# How to Test Flannel with Calico Network Policy in a Lab Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Flannel, Canal, Kubernetes, Networking, Testing, Lab

Description: A guide to building and running a Canal (Flannel + Calico network policy) lab environment using kind or kubeadm for testing network policy behavior.

---

## Introduction

A lab environment for testing Canal allows you to experiment with network policy behavior, verify Calico's policy enforcement logic, and build runbooks for production scenarios - all without risking production workloads. The lab can be created with `kind` (Kubernetes in Docker) or a simple kubeadm cluster on virtual machines. Canal installs identically in both environments, so policies tested in the lab apply directly to production.

## Option 1: kind-Based Lab

Kind supports multi-node clusters suitable for testing cross-node Canal networking.

```bash
# Install kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x kind && sudo mv kind /usr/local/bin/

# Create a 3-node cluster with no default CNI
cat <<EOF > kind-canal.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  podSubnet: "10.244.0.0/16"
  disableDefaultCNI: true
nodes:
- role: control-plane
- role: worker
- role: worker
EOF

kind create cluster --config kind-canal.yaml --name canal-lab
```

Install Canal.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml
kubectl wait --for=condition=Ready pods -n kube-system -l k8s-app=canal --timeout=120s
```

## Option 2: kubeadm Lab on VMs

```bash
kubeadm init --pod-network-cidr=10.244.0.0/16
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml
```

## Test Scenario 1: Default Allow (No Policy)

```bash
kubectl run client --image=busybox --restart=Never -- sleep 3600
kubectl run server --image=nginx --restart=Never
kubectl expose pod server --port=80

kubectl exec client -- wget -qO- http://server
```

Without any policy, all traffic is allowed.

## Test Scenario 2: Deny All Ingress

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

kubectl exec client -- wget --timeout=5 -qO- http://server || echo "Blocked"
kubectl delete networkpolicy deny-all
```

## Test Scenario 3: Allow Specific Label

```bash
kubectl label pod client role=frontend

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: server
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
  policyTypes: [Ingress]
EOF

kubectl exec client -- wget --timeout=5 -qO- http://server | head -5
kubectl delete networkpolicy allow-frontend
```

## Test Scenario 4: Namespace Isolation

```bash
kubectl create namespace isolated
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-ns
  namespace: isolated
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

kubectl run cross-test -n isolated --image=nginx --restart=Never
kubectl exec client -- wget --timeout=5 -qO- http://cross-test.isolated.svc.cluster.local || echo "Cross-namespace blocked"
kubectl delete namespace isolated
```

## Cleanup

```bash
kubectl delete pod client server --force
kubectl delete svc server
kind delete cluster --name canal-lab  # if using kind
```

## Conclusion

A Canal lab environment - whether kind-based or kubeadm-based - provides a safe space to test all network policy behaviors: default allow, deny-all ingress, label-based allow, and namespace isolation. The policies tested in the lab directly reflect production Canal behavior, making the lab an effective validation tool for both new policy designs and incident investigation scenarios.
