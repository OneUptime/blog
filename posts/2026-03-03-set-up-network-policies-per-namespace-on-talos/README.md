# How to Set Up Network Policies per Namespace on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Network Policies, Security, Namespace Isolation

Description: A comprehensive guide to implementing Kubernetes network policies per namespace on Talos Linux for controlling pod-to-pod traffic and enhancing cluster security.

---

By default, every pod in a Kubernetes cluster can talk to every other pod, regardless of which namespace they are in. On a shared Talos Linux cluster, this is a significant security gap. A compromised pod in one namespace could probe services in other namespaces, exfiltrate data, or move laterally through the cluster. Network policies close this gap by letting you define exactly which traffic is allowed between pods and namespaces.

This post covers how to implement network policies per namespace on a Talos Linux cluster, from basic deny-all rules to sophisticated policies that allow only the traffic your applications actually need.

## Prerequisites: A CNI That Supports Network Policies

Kubernetes network policies are defined through the API, but the CNI plugin is responsible for enforcing them. On Talos Linux, Cilium is the most popular CNI with full network policy support.

```bash
# Install Cilium on your Talos cluster
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set policyEnforcementMode=default
```

If you are using Flannel, note that it does not enforce network policies. You would need to add a network policy enforcement layer like Calico alongside Flannel to get policy support.

## The Default Deny Foundation

The most important network policy is the default deny. Without it, all traffic is allowed. With it, only traffic you explicitly permit can flow.

```yaml
# default-deny-all.yaml
# Block all ingress and egress traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: team-backend
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Apply this to every namespace that needs isolation:

```bash
# Apply to all team namespaces
for ns in team-backend team-frontend team-data; do
  kubectl -n $ns apply -f default-deny-all.yaml
done
```

After applying the default deny, pods in the namespace cannot send or receive any traffic. You need to add policies that explicitly allow the traffic patterns your applications need.

## Allowing DNS Resolution

The first thing that breaks after a default deny is DNS resolution. Pods need to reach the kube-dns service to resolve service names. Add this policy to every namespace with a default deny.

```yaml
# allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: team-backend
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS queries to kube-dns in kube-system
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Allowing Intra-Namespace Traffic

Most applications need their pods to communicate within the same namespace. An API server talks to a cache, a worker talks to a queue, and so on.

```yaml
# allow-intra-namespace.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-intra-namespace
  namespace: team-backend
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
```

This allows any pod in the namespace to communicate with any other pod in the same namespace. For tighter security, you can replace the empty `podSelector: {}` with specific label selectors to allow only the connections your application architecture requires.

## Allowing Ingress Traffic from Outside

Web-facing services need to receive traffic from an ingress controller. The ingress controller typically runs in its own namespace.

```yaml
# allow-from-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: team-backend
spec:
  podSelector:
    matchLabels:
      # Only apply to pods that serve external traffic
      role: web-api
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

This policy allows traffic from the ingress-nginx namespace to pods labeled `role: web-api` on port 8080. Traffic from any other source is still blocked.

## Allowing Access to Shared Services

Many clusters have shared services like databases, message queues, or monitoring systems in their own namespaces. You need to allow specific namespaces to access these shared services.

```yaml
# In the shared-services namespace, allow access from team namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-teams
  namespace: shared-services
spec:
  podSelector:
    matchLabels:
      app: postgresql
  policyTypes:
    - Ingress
  ingress:
    # Allow team-backend to access PostgreSQL
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: team-backend
      ports:
        - protocol: TCP
          port: 5432
    # Allow team-data to access PostgreSQL
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: team-data
      ports:
        - protocol: TCP
          port: 5432
```

On the client side, you also need an egress policy allowing the team namespace to reach the shared service:

```yaml
# In team-backend, allow egress to the database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-to-database
  namespace: team-backend
spec:
  podSelector:
    matchLabels:
      needs-database: "true"
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: shared-services
          podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
```

## Allowing External Internet Access

Some pods need to reach external APIs or download dependencies. Allow egress to external IPs while keeping internal cross-namespace traffic blocked.

```yaml
# allow-external-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-egress
  namespace: team-backend
spec:
  podSelector:
    matchLabels:
      needs-internet: "true"
  policyTypes:
    - Egress
  egress:
    # Allow HTTPS to external services
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              # Block access to internal cluster ranges
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

This allows pods labeled `needs-internet: "true"` to reach external HTTPS and HTTP endpoints while blocking access to internal cluster networks. This prevents a compromised pod from probing internal services.

## Monitoring Namespace Policy

Monitoring policies help you observe traffic patterns within a namespace. On Cilium, you can enable Hubble for network flow visibility.

```bash
# Enable Hubble on Cilium
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --reuse-values

# View traffic flows for a namespace
kubectl -n kube-system exec ds/cilium -- hubble observe --namespace team-backend

# Check for dropped traffic (policy violations)
kubectl -n kube-system exec ds/cilium -- hubble observe \
  --namespace team-backend \
  --verdict DROPPED
```

Dropped traffic indicates either a misconfigured policy or an unauthorized communication attempt. Review dropped flows regularly to tune your policies and identify potential security issues.

## Complete Namespace Policy Template

Here is a complete set of network policies for a typical application namespace.

```yaml
# complete-namespace-policies.yaml
# 1. Default deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
# 2. Allow DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - {protocol: UDP, port: 53}
        - {protocol: TCP, port: 53}
---
# 3. Allow intra-namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-intra-namespace
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    - from: [{podSelector: {}}]
  egress:
    - to: [{podSelector: {}}]
---
# 4. Allow from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
spec:
  podSelector:
    matchLabels:
      exposed: "true"
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
```

Apply to a namespace:

```bash
kubectl -n team-backend apply -f complete-namespace-policies.yaml
```

## Testing Network Policies

Always test your policies to make sure they work as expected.

```bash
# Test that intra-namespace traffic works
kubectl -n team-backend run test-client --image=busybox --command -- sleep 3600
kubectl -n team-backend exec test-client -- wget -qO- http://my-service:8080 --timeout=5

# Test that cross-namespace traffic is blocked
kubectl -n team-frontend run test-client --image=busybox --command -- sleep 3600
kubectl -n team-frontend exec test-client -- wget -qO- http://my-service.team-backend:8080 --timeout=5
# This should time out if policies are working correctly

# Clean up test pods
kubectl -n team-backend delete pod test-client
kubectl -n team-frontend delete pod test-client
```

## Conclusion

Network policies are one of the most effective security controls you can apply to a shared Talos Linux cluster. Start with a default deny in every namespace, then add policies for DNS, intra-namespace traffic, ingress controllers, shared services, and external access as needed. Use Cilium with Hubble for enforcement and visibility. Test every policy after applying it, and monitor for dropped traffic that might indicate misconfiguration or unauthorized access attempts. A well-designed set of network policies per namespace turns your Talos cluster into a properly segmented environment where compromising one namespace does not automatically grant access to the rest.
