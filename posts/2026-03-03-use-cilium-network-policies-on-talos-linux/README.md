# How to Use Cilium Network Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, Network Policies, Kubernetes, Security

Description: A practical guide to implementing Cilium network policies on Talos Linux for securing pod-to-pod communication in your cluster.

---

By default, Kubernetes allows all pods to communicate with every other pod in the cluster. This is convenient for getting started but terrible for security. A single compromised pod could reach every service, every database, and every internal API. Network policies fix this by letting you define rules about which pods can talk to which other pods. Cilium on Talos Linux takes network policies further with its own CiliumNetworkPolicy resources that support Layer 7 filtering, DNS-aware rules, and identity-based access control.

## Kubernetes Network Policies vs. Cilium Network Policies

Kubernetes has built-in NetworkPolicy resources, and Cilium fully supports them. But Cilium also offers its own CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy resources that are more powerful:

- **Layer 7 filtering** - Control HTTP methods, paths, and headers
- **DNS-based policies** - Allow traffic to specific domain names
- **Identity-aware** - Policies based on Cilium security identities, not just labels
- **Cluster-wide scope** - Apply policies across all namespaces
- **CIDR-based rules** - Control traffic to/from external IP ranges

You can mix standard Kubernetes NetworkPolicies with Cilium-specific policies in the same cluster.

## Setting Up a Default Deny Policy

The first step in securing your cluster is denying all traffic by default, then explicitly allowing what is needed:

```yaml
# default-deny-all.yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: default-deny
spec:
  endpointSelector: {}
  ingress:
  - fromEndpoints:
    - {}
  egress:
  - toEndpoints:
    - {}
```

Wait - that actually allows all cluster-internal traffic and only denies external. For a true default deny:

```yaml
# strict-default-deny.yaml
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

This blocks all ingress and egress traffic for every pod in the production namespace. Now pods cannot communicate at all until you add allow rules.

```bash
kubectl apply -f strict-default-deny.yaml
```

## Allowing DNS

After enabling default deny, you need to allow DNS or nothing will work. Pods need to resolve service names:

```yaml
# allow-dns.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  endpointSelector: {}
  egress:
  - toEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: kube-system
        k8s-app: kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
      - port: "53"
        protocol: TCP
```

```bash
kubectl apply -f allow-dns.yaml
```

## Allowing Specific Service Communication

Now create targeted policies for your application. Say you have a web frontend that needs to talk to an API server, and the API server needs to talk to a database:

```yaml
# frontend-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: frontend
  ingress:
  # Allow traffic from any source on port 80
  - fromEntities:
    - world
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
  egress:
  # Allow traffic to the API service
  - toEndpoints:
    - matchLabels:
        app: api
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
---
# api-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
  # Only accept traffic from the frontend
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
  egress:
  # Allow traffic to the database
  - toEndpoints:
    - matchLabels:
        app: postgres
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
---
# database-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: postgres
  ingress:
  # Only accept traffic from the API
  - fromEndpoints:
    - matchLabels:
        app: api
    toPorts:
    - ports:
      - port: "5432"
        protocol: TCP
  egress: []  # No egress needed
```

```bash
kubectl apply -f frontend-policy.yaml
kubectl apply -f api-policy.yaml
kubectl apply -f database-policy.yaml
```

## Layer 7 HTTP Policies

Cilium can filter HTTP traffic at the application layer. This lets you control not just which pods can connect, but what HTTP methods and paths they can use:

```yaml
# api-l7-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        # Allow GET requests to /api/v1/products
        - method: GET
          path: "/api/v1/products"
        # Allow POST requests to /api/v1/orders
        - method: POST
          path: "/api/v1/orders"
        # Allow GET requests to any /api/v1/users path
        - method: GET
          path: "/api/v1/users/.*"
```

This is powerful for implementing zero-trust networking where even allowed connections are restricted to specific API endpoints.

## DNS-Aware Policies

Cilium can create policies based on DNS names, which is useful for controlling access to external services:

```yaml
# external-access-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-apis
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: payment-service
  egress:
  # Allow DNS resolution
  - toEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: kube-system
        k8s-app: kube-dns
    toPorts:
    - ports:
      - port: "53"
        protocol: UDP
  # Allow HTTPS to specific external domains
  - toFQDNs:
    - matchName: "api.stripe.com"
    - matchName: "api.paypal.com"
    - matchPattern: "*.amazonaws.com"
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

This ensures the payment service can only reach Stripe, PayPal, and AWS endpoints, nothing else.

## CIDR-Based Policies

Control traffic to specific IP ranges:

```yaml
# cidr-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-private-network
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: monitoring
  egress:
  # Allow traffic to the internal monitoring network
  - toCIDR:
    - "10.100.0.0/16"
    toPorts:
    - ports:
      - port: "9090"
        protocol: TCP
  # Block traffic to specific IPs even within allowed CIDRs
  - toCIDRSet:
    - cidr: "10.100.0.0/16"
      except:
      - "10.100.50.0/24"  # Restricted subnet
```

## Cluster-Wide Policies

For rules that should apply across all namespaces, use CiliumClusterwideNetworkPolicy:

```yaml
# cluster-wide-deny-external.yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: deny-external-by-default
spec:
  endpointSelector:
    matchLabels:
      internet-access: restricted
  egressDeny:
  - toEntities:
    - world
```

Label any pod with `internet-access: restricted` and it will be blocked from reaching the internet.

## Testing and Debugging Policies

Cilium provides tools to debug network policies:

```bash
# Check which policies apply to a specific pod
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Get the Cilium endpoint ID for your pod
kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep <pod-name>

# Check policy verdict for a specific endpoint
kubectl exec -n kube-system ds/cilium -- cilium policy get --numeric <endpoint-id>

# Monitor policy decisions in real time
kubectl exec -n kube-system ds/cilium -- cilium monitor --type policy-verdict

# Use Hubble to see dropped traffic
hubble observe --verdict DROPPED --namespace production
```

## Policy Troubleshooting on Talos Linux

If traffic is unexpectedly blocked:

```bash
# Check Cilium identity for the source pod
kubectl exec -n kube-system ds/cilium -- cilium identity list

# Verify the policy was correctly applied
kubectl get cnp -n production -o yaml

# Check for policy errors
kubectl describe cnp frontend-policy -n production

# Look at Cilium agent logs for policy-related messages
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -i "policy\|denied\|drop"
```

## Best Practices

Start with monitoring before enforcing. Use Hubble to observe traffic patterns and understand your application's communication needs before writing policies. Write policies in a staging environment first, then apply to production.

Always allow DNS egress. Without DNS resolution, almost nothing works. Make this your first allow rule after default deny.

Use labels consistently. Good labeling practices make network policies much easier to write and maintain.

Test policy changes with Hubble. After applying a new policy, watch Hubble for unexpected drops to catch any rules you missed.

## Summary

Cilium network policies on Talos Linux give you granular control over pod communication from Layer 3 through Layer 7. Start with a default deny posture, allow DNS, then build up specific rules for each application. Use Cilium-specific policies for advanced features like HTTP filtering and DNS-aware rules. Combined with Hubble for visibility, you get a comprehensive network security layer that protects your workloads while keeping troubleshooting straightforward.
