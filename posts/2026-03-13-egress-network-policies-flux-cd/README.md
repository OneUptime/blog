# How to Configure Egress Network Policies with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Network Policy, Egress, Kubernetes, Security, GitOps, Networking

Description: Learn how to manage Kubernetes egress NetworkPolicy resources using Flux CD GitOps to control outbound traffic from pods to external services and the internet.

---

## Introduction

Egress network policies control what external services your pods can connect to. Without egress policies, any pod in your cluster can make outbound connections to any IP address, including the internet. Controlling egress is critical for data exfiltration prevention, compliance, and preventing compromised pods from reaching command-and-control servers. Managing these policies through Flux CD ensures they are consistently applied and version-controlled.

## Prerequisites

- Kubernetes cluster with Cilium, Calico, or another NetworkPolicy-supporting CNI
- Flux CD bootstrapped
- Understanding of Kubernetes NetworkPolicy egress rules

## Step 1: Plan Your Egress Requirements

Document what each application namespace needs to reach:

```
Namespace: myapp
Egress allowed to:
  - PostgreSQL in database namespace (port 5432)
  - Redis in cache namespace (port 6379)
  - External payment API: api.stripe.com (port 443)
  - Internal auth service in auth namespace (port 8080)
  - kube-dns (UDP/TCP 53)
  - AWS services via VPC endpoints
```

## Step 2: Create a Default-Deny Egress Policy

```yaml
# apps/myapp/network-policies/egress-default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: myapp
  labels:
    app.kubernetes.io/component: network-policy
    policy-type: default-deny
spec:
  podSelector: {}  # All pods in namespace
  policyTypes:
    - Egress
  egress: []  # Empty list = deny all egress
```

## Step 3: Allow Required Egress Traffic

```yaml
# apps/myapp/network-policies/egress-allow-internal.yaml
---
# Allow egress to PostgreSQL
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-postgresql
  namespace: myapp
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: database
          podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
---
# Allow egress to Redis cache
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-redis
  namespace: myapp
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: cache
          podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
---
# Allow DNS resolution (required for all pods with egress policies)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-dns
  namespace: myapp
spec:
  podSelector: {}  # All pods need DNS
  policyTypes:
    - Egress
  egress:
    - to: []  # To any destination
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Step 4: Allow External HTTPS Egress for Specific Domains

Standard Kubernetes NetworkPolicy only supports IP-based rules, not domain names. For domain-based egress, use Cilium NetworkPolicy (CiliumNetworkPolicy):

```yaml
# Cilium-specific: Allow egress to stripe.com by FQDN
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-egress-stripe
  namespace: myapp
spec:
  endpointSelector:
    matchLabels:
      app: myapp-payment
  egress:
    - toFQDNs:
        - matchName: "api.stripe.com"
        - matchName: "hooks.stripe.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Step 5: Allow Egress to AWS Services via IP Blocks

For standard Kubernetes NetworkPolicy, use CIDR blocks for external services:

```yaml
# Allow egress to AWS API Gateway endpoints (example IPs)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-aws-services
  namespace: myapp
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 52.94.0.0/22  # AWS us-east-1 API endpoint range
        - ipBlock:
            cidr: 54.239.0.0/17  # AWS us-east-1 services
      ports:
        - protocol: TCP
          port: 443
```

## Step 6: Deploy Egress Policies via Flux

```yaml
# clusters/production/apps/myapp-network-policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-network-policies
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/myapp/network-policies
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  # Network policies should apply before the application
  dependsOn:
    - name: cilium  # Ensure CNI is ready first
```

## Step 7: Test and Verify

```bash
# Test that allowed egress works
kubectl exec -n myapp deployment/myapp -- \
  nc -zv postgresql.database.svc.cluster.local 5432

# Test that blocked egress fails (should timeout or be refused)
kubectl exec -n myapp deployment/myapp -- \
  curl -sf --max-time 5 https://malicious.example.com
# Should fail with connection timeout

# View Cilium flow logs for denied connections
kubectl exec -n kube-system ds/cilium -- \
  cilium monitor --type drop --related-to-endpoint myapp-pod-name

# List all NetworkPolicies in the namespace
kubectl get networkpolicies -n myapp
kubectl get ciliumnetworkpolicies -n myapp
```

## Best Practices

- Always add a DNS egress rule alongside any default-deny egress policy; without it, pods cannot resolve any hostname.
- Use CiliumNetworkPolicy FQDN rules for external services with dynamic IPs rather than hardcoding IP ranges.
- Test egress policies in staging with the same external dependencies as production to catch missing allow rules.
- Audit egress rules regularly; over time, teams add allow rules but rarely remove them.
- Use Cilium Hubble to visualize actual egress connections and identify what your applications are actually connecting to before writing policies.
- For compliance requirements (PCI DSS, HIPAA), document egress policies alongside your compliance controls.

## Conclusion

Egress NetworkPolicies managed through Flux CD provide a GitOps-native approach to network security. The default-deny egress model ensures that only explicitly approved outbound connections are permitted, reducing the risk of data exfiltration and lateral movement. With Cilium's FQDN support, you can express policies in terms of domain names rather than fragile IP ranges, making them more maintainable.
