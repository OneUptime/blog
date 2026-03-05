# How to Configure Network Policies for Flux Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Network Policies, Network Segmentation

Description: Learn how to configure Kubernetes NetworkPolicies for Flux CD controllers to restrict network traffic and reduce the attack surface.

---

Flux CD controllers need network access to communicate with the Kubernetes API server, Git repositories, Helm repositories, container registries, and notification endpoints. By default, pods in Kubernetes can communicate with any other pod or external endpoint. Network policies let you restrict this traffic to only what is required.

This guide walks you through creating NetworkPolicies for each Flux CD controller.

## Prerequisites

Network policies require a CNI plugin that supports them, such as Calico, Cilium, or Weave Net. Verify your cluster supports network policies:

```bash
# Check which CNI plugin is installed
kubectl get pods -n kube-system | grep -E "calico|cilium|weave"

# Verify network policy enforcement by checking for the NetworkPolicy API
kubectl api-resources | grep networkpolicies
```

## Default Deny Policy

Start with a default deny policy for the `flux-system` namespace that blocks all ingress and egress traffic:

```yaml
# default-deny-flux-system.yaml
# Default deny all ingress and egress traffic in the flux-system namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Allow DNS Resolution

All controllers need DNS resolution to function. Allow egress to the kube-dns service:

```yaml
# allow-dns.yaml
# Allow all Flux controllers to resolve DNS queries
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS over TCP and UDP on port 53
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

## Allow Kubernetes API Server Access

All Flux controllers need to communicate with the Kubernetes API server:

```yaml
# allow-api-server.yaml
# Allow all Flux controllers to communicate with the Kubernetes API server
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-server
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow HTTPS traffic to the API server
    # Replace with your API server IP/CIDR for stricter control
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
```

## Source Controller Network Policy

The source-controller needs egress access to Git hosts, Helm repositories, OCI registries, and S3-compatible storage:

```yaml
# networkpolicy-source-controller.yaml
# Network policy for source-controller: allows access to external sources
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: source-controller
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow other Flux controllers to fetch artifacts from source-controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: flux-system
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
  egress:
    # Allow HTTPS to external Git/Helm/OCI endpoints
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
    # Allow SSH for Git over SSH
    - ports:
        - protocol: TCP
          port: 22
```

## Kustomize Controller Network Policy

The kustomize-controller primarily communicates with the API server and fetches artifacts from source-controller:

```yaml
# networkpolicy-kustomize-controller.yaml
# Network policy for kustomize-controller: API server and source-controller access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: kustomize-controller
  policyTypes:
    - Egress
  egress:
    # Allow communication with source-controller for artifact fetching
    - to:
        - podSelector:
            matchLabels:
              app: source-controller
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
    # Allow communication with the Kubernetes API server
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
```

## Notification Controller Network Policy

The notification-controller needs to send alerts to external services and receive webhooks:

```yaml
# networkpolicy-notification-controller.yaml
# Network policy for notification-controller: webhooks and alert destinations
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow inbound webhook traffic from external sources
    - ports:
        - protocol: TCP
          port: 9292
  egress:
    # Allow HTTPS to notification providers (Slack, Teams, PagerDuty, etc.)
    - ports:
        - protocol: TCP
          port: 443
    # Allow Kubernetes API server access
    - ports:
        - protocol: TCP
          port: 6443
```

## Applying All Network Policies

Apply all policies and verify that Flux continues to function:

```bash
# Apply all network policies
kubectl apply -f default-deny-flux-system.yaml
kubectl apply -f allow-dns.yaml
kubectl apply -f allow-api-server.yaml
kubectl apply -f networkpolicy-source-controller.yaml
kubectl apply -f networkpolicy-kustomize-controller.yaml
kubectl apply -f networkpolicy-notification-controller.yaml

# Verify policies are created
kubectl get networkpolicies -n flux-system

# Trigger a reconciliation to verify connectivity
flux reconcile source git flux-system
flux reconcile kustomization flux-system

# Check controller logs for network errors
kubectl logs -n flux-system deployment/source-controller --tail=20
kubectl logs -n flux-system deployment/kustomize-controller --tail=20
```

## Troubleshooting Network Policy Issues

If Flux stops reconciling after applying network policies, debug the issue:

```bash
# Check for timeout or connection refused errors
kubectl logs -n flux-system deployment/source-controller | grep -i "timeout\|refused\|dial"

# Temporarily remove the default deny to isolate the issue
kubectl delete networkpolicy default-deny-all -n flux-system

# Use a debug pod to test connectivity from the flux-system namespace
kubectl run nettest --image=busybox -n flux-system --rm -it -- wget -qO- https://github.com --timeout=5
```

## Best Practices

1. **Start with monitoring**: Apply policies in a test environment first and verify that all reconciliations succeed before applying to production.
2. **Use IP-based rules for the API server**: Replace broad port-based egress rules with IP-specific rules for the API server to prevent data exfiltration.
3. **Restrict by destination**: Where possible, limit egress to specific IP ranges or domain names (if your CNI supports FQDN-based policies).
4. **Combine with service mesh**: For more granular control, use a service mesh like Istio or Linkerd alongside network policies.
5. **Monitor dropped connections**: Set up logging for dropped network connections to identify policy gaps.

Network policies are a critical layer of defense for Flux CD controllers. By restricting network access to only the required endpoints, you reduce the potential impact of a compromised controller and maintain a strong security posture.
