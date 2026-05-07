# How to Configure Network Policies in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Network Policies

Description: Learn how to configure Kubernetes Network Policies in Rancher to control traffic flow between pods and namespaces.

Network Policies in Kubernetes allow you to control the flow of traffic between pods, namespaces, and external endpoints. They act as a firewall for your cluster, defining which pods can communicate with each other. This guide walks through configuring Network Policies in Rancher-managed clusters.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster with a CNI plugin that supports Network Policies (Calico, Canal, Cilium, or Weave)
- kubectl access to your cluster

## Understanding Network Policies

By default, all pods in Kubernetes can communicate with all other pods. Network Policies allow you to restrict this behavior. Key concepts:

- **Ingress rules**: Control incoming traffic to pods
- **Egress rules**: Control outgoing traffic from pods
- **Pod selectors**: Target specific pods by labels
- **Namespace selectors**: Target pods in specific namespaces
- **IP blocks**: Allow or deny specific CIDR ranges

## Step 1: Verify Your CNI Supports Network Policies

```bash
kubectl get pods -n kube-system | grep -E "calico|canal|cilium|weave"
```

RKE and RKE2 clusters deployed through Rancher typically use Canal (Calico + Flannel), which supports Network Policies.

## Step 2: Create a Default Deny All Policy

Start with a deny-all policy and then open up specific traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

This blocks all ingress and egress traffic for all pods in the `production` namespace.

```bash
kubectl apply -f default-deny.yaml
```

## Step 3: Allow DNS Traffic

After applying a deny-all policy, you need to allow DNS so pods can resolve service names:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Step 4: Allow Traffic Between Specific Pods

Allow the frontend to communicate with the backend:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
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
    ports:
    - protocol: TCP
      port: 8080
```

## Step 5: Allow Traffic from a Specific Namespace

Allow monitoring tools to scrape metrics from all pods:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          purpose: monitoring
    ports:
    - protocol: TCP
      port: 9090
```

Label the monitoring namespace first:

```bash
kubectl label namespace cattle-monitoring-system purpose=monitoring
```

## Step 6: Allow Ingress Controller Traffic

Allow traffic from the namespace where your ingress controller runs to reach your applications. This example uses `ingress-nginx`; if your cluster uses Traefik or another controller, adjust the namespace selector accordingly:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-app
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
```

## Step 7: Restrict Egress to Specific IP Ranges

Allow pods to reach only specific internal and external IP ranges:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 10.0.0.0/8
  - to:
    - ipBlock:
        cidr: 203.0.113.0/24
    ports:
    - protocol: TCP
      port: 443
```

## Step 8: Create Policies via the Rancher UI

1. Navigate to your cluster in the Rancher dashboard and click **Explore**.
2. Open the `production` namespace in Cluster Explorer.
3. Create a `NetworkPolicy` resource using the form or **Create from YAML**, depending on your Rancher version.
4. Configure:
   - **Kind**: `NetworkPolicy`
   - **Name**: `allow-frontend-to-backend`
   - **Namespace**: `production`
   - **Pod Selector**: `app = backend`
5. Add Ingress rules specifying which pods can connect.
6. Add Egress rules specifying what the selected pods can reach.
7. Click **Create**.

## Step 9: Combine Multiple Rules

Create a comprehensive policy for a database tier:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 5432
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

This allows only backend pods to connect to the database on port 5432 and allows database pods to replicate with each other.

## Step 10: Verify Network Policies

Test that policies are enforced:

```bash
# List all network policies

kubectl get networkpolicies -n production

# Describe a specific policy
kubectl describe networkpolicy database-policy -n production

# Test connectivity (should succeed)
kubectl run test-backend --image=busybox --restart=Never --rm -it --labels="tier=backend" -n production --command -- nc -z -v -w 5 db-service 5432

# Test connectivity (should fail)
kubectl run test-frontend --image=busybox --restart=Never --rm -it --labels="tier=frontend" -n production --command -- nc -z -v -w 5 db-service 5432
```

## Troubleshooting

- **Policies not enforced**: Verify your CNI supports Network Policies
- **All traffic blocked**: Ensure you have a DNS egress rule
- **Cannot reach ingress controller**: Add a rule allowing traffic from the ingress namespace
- **Debug with logs**: Check CNI plugin logs for denied connections
- **Policy evaluation**: Network Policies are additive within ingress and egress, but pod-to-pod traffic is allowed only when the source pod's egress policy and the destination pod's ingress policy both allow it

## Summary

Network Policies in Rancher provide granular control over pod-to-pod communication. By starting with a deny-all policy and selectively opening traffic paths, you can implement a zero-trust network model within your Kubernetes clusters. Rancher's UI simplifies policy creation, while kubectl gives you full control over complex multi-rule configurations.
