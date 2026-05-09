# How to Test Network Policies with Calico on Self-Managed AWS Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, AWS, Self-Managed, Security

Description: Test and validate Kubernetes network policies enforced by Calico on self-managed Kubernetes clusters running on AWS EC2.

---

## Introduction

Self-managed Kubernetes on AWS EC2 can run Calico as the cluster CNI with Calico IPAM, BGP routing, and network policy enforcement. This gives you direct control over Calico networking features including IPIP/VXLAN encapsulation, BGP peering, and GlobalNetworkPolicy resources.

On AWS, encapsulation is required for cross-subnet pod-to-pod traffic unless the underlying network can route pod CIDRs. Calico documents IPIP with outgoing NAT for traffic across AWS VPC subnet boundaries, and VXLAN is another Calico overlay option when you do not want the underlay network to route workload IPs.

Testing network policies on self-managed AWS clusters validates the Calico policy stack including cross-subnet and cross-AZ scenarios.

## Prerequisites

- Self-managed Kubernetes cluster on AWS EC2
- Calico installed with `kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml`
- kubectl and calicoctl configured

## Step 1: Verify Cluster and Calico Health

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system | grep calico
calicoctl node status
calicoctl get ippool -o yaml
```

## Step 2: Create Multi-AZ Test Resources

```bash
kubectl create namespace aws-policy-test

kubectl run web-frontend --image=busybox -n aws-policy-test \
  --labels=tier=frontend --command -- sleep 3600
kubectl run api-backend --image=nginx -n aws-policy-test \
  --labels=tier=backend --port=80
kubectl expose pod api-backend --port=80 -n aws-policy-test --name=api-svc

kubectl run unauthorized --image=busybox -n aws-policy-test \
  --labels=tier=unauthorized --command -- sleep 3600
```

## Step 3: Test Pre-Policy Connectivity

```bash
kubectl exec -n aws-policy-test web-frontend -- \
  wget -T 5 -qO- http://api-svc
kubectl exec -n aws-policy-test unauthorized -- \
  wget -T 5 -qO- http://api-svc
```

Both should succeed.

## Step 4: Apply Default Deny

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: aws-policy-test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

## Step 5: Allow DNS and Frontend Access

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-and-frontend
  namespace: aws-policy-test
spec:
  podSelector:
    matchLabels:
      tier: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 80
  egress:
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 6: Apply Frontend Egress

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: aws-policy-test
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 80
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 7: Verify Policies

```bash
# Should succeed

kubectl exec -n aws-policy-test web-frontend -- wget -T 5 -qO- http://api-svc

# Should fail
kubectl exec -n aws-policy-test unauthorized -- \
  wget -T 5 -qO- http://api-svc
```

## Step 8: Test Cross-AZ Policy (Multi-Node)

If nodes are in multiple AWS AZs:

```bash
kubectl get nodes -L topology.kubernetes.io/zone
```

Create pods in different AZs and verify cross-AZ network policies work:

```bash
ZONE_A_NODE=$(kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a -o name | head -1 | cut -d/ -f2)
ZONE_B_NODE=$(kubectl get nodes -l topology.kubernetes.io/zone=us-east-1b -o name | head -1 | cut -d/ -f2)

kubectl run cross-az-client --image=busybox -n aws-policy-test \
  --labels=tier=frontend \
  --overrides="{\"apiVersion\":\"v1\",\"spec\":{\"nodeName\":\"$ZONE_A_NODE\"}}" --command -- sleep 3600
kubectl run cross-az-server --image=nginx -n aws-policy-test \
  --labels=tier=backend --port=80 \
  --overrides="{\"apiVersion\":\"v1\",\"spec\":{\"nodeName\":\"$ZONE_B_NODE\"}}"

CROSS_AZ_SERVER_IP=$(kubectl get pod cross-az-server -n aws-policy-test -o jsonpath='{.status.podIP}')
kubectl exec -n aws-policy-test cross-az-client -- \
  wget -T 5 -qO- http://$CROSS_AZ_SERVER_IP
```

## Conclusion

You have tested Calico network policies on self-managed AWS Kubernetes, validating default deny, selective allow, and cross-AZ policy enforcement. Self-managed Kubernetes on AWS gives you the full Calico feature set, and Calico correctly enforces policies across EC2 instances in different AZs using IPIP or VXLAN encapsulation through AWS VPC networking.
