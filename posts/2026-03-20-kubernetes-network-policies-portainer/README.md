# How to Manage Kubernetes Network Policies with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Portainer, Network Policies, Container Security, DevOps

Description: Learn how to define and manage Kubernetes Network Policies using Portainer's GUI to control traffic flow between pods and namespaces.

## Introduction

Kubernetes Network Policies allow you to control traffic flow at the IP address or port level between pods, namespaces, and external endpoints. Managing these policies through Portainer's web interface gives you a convenient way to deploy and organize the YAML manifests without working entirely from the command line.

## Prerequisites

- A running Kubernetes cluster
- Portainer Business Edition or Community Edition installed
- A CNI plugin that supports Network Policies (Calico, Cilium, Weave Net)
- kubectl access to your cluster

## Understanding Kubernetes Network Policies

By default, all pods in a Kubernetes cluster can communicate freely with each other. Network Policies introduce rules to restrict this communication, helping you implement a zero-trust security model.

A Network Policy consists of:
- **Pod selectors** – which pods the policy applies to
- **Ingress rules** – allowed inbound traffic
- **Egress rules** – allowed outbound traffic

## Setting Up Network Policies in Portainer

### Step 1: Navigate to Your Cluster

1. Log into Portainer and select your Kubernetes environment.
2. In the left sidebar, go to **Applications** and click **Create from code**.
3. Select **Manifest**.

### Step 2: Create a Default Deny Policy

Start with a default-deny policy to block all traffic, then selectively allow what is needed.

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

In Portainer, choose the `production` namespace in the deploy options (or enable **Use namespace(s) specified from manifest**), paste this YAML into the web editor, and click **Deploy**.

### Step 3: Allow Specific Traffic

Allow traffic from a frontend namespace to a backend service:

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
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: frontend
      ports:
        - protocol: TCP
          port: 8080
```

### Step 4: Allow DNS Egress

Pods often need DNS resolution. Ensure you allow egress for DNS resolution:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  egress:
    - ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
  policyTypes:
    - Egress
```

## Verifying Network Policies

Use Portainer's `kubectl shell` or `kubectl` to test connectivity:

```bash
# Test connectivity between pods

kubectl exec -it frontend-pod -n frontend -- curl http://backend-service.production.svc:8080

# List all network policies in a namespace
kubectl get networkpolicies -n production
```

## Monitoring Policy Effectiveness

Portainer's `kubectl shell` lets you inspect the applied policies without leaving the UI.

For deeper inspection, use:

```bash
kubectl describe networkpolicy allow-frontend-to-backend -n production
```

## Best Practices

- Always start with a default-deny policy and add exceptions.
- Label namespaces consistently to simplify namespace selectors.
- Document each policy with annotations explaining its purpose.
- Regularly audit policies to remove stale rules.
- Use Portainer's RBAC features in Business Edition to control who can modify network policies.

## Conclusion

Managing Kubernetes Network Policies through Portainer simplifies the process of securing inter-pod communication. By combining Portainer's GUI with well-structured YAML policies, you can enforce least-privilege networking across your cluster without deep command-line expertise.
