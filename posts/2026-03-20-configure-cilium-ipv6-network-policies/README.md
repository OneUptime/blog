# How to Configure Cilium IPv6 Network Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, IPv6, Network Policy, Kubernetes, CiliumNetworkPolicy, Security

Description: Configure Cilium network policies for IPv6 Kubernetes workloads, including pod-to-pod policies, CIDR-based rules for external IPv6 ranges, and L7 policies.

## Introduction

Cilium extends Kubernetes NetworkPolicy with CiliumNetworkPolicy (CNP), adding L7 visibility, DNS-based policies, and CIDR rules that work correctly with IPv6. This post covers practical IPv6 policy configurations for common scenarios.

## Basic IPv6 Pod-to-Pod Policy

```yaml
# Allow frontend pods to reach backend pods on port 8080

apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend

  ingress:
    # Allow from frontend pods
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP

    # Allow requests from any Cilium-managed pod in cluster
    - fromEndpoints:
        - matchExpressions:
            - key: "k8s:io.kubernetes.pod.namespace"
              operator: "Exists"
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP

  egress:
    # Allow DNS resolution
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*"
```

## CIDR-Based Policy for External IPv6

```yaml
# Restrict which external IPv6 ranges can reach a service
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: restrict-external-ipv6
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-server

  ingress:
    # Allow from trusted IPv6 ranges
    - fromCIDR:
        - "2001:db8:100::/48"       # Corporate network
        - "fd00:100::/64"           # VPN clients
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP

    # Deny everything else (default deny via Cilium)
```

## L7 HTTP Policy with IPv6

```yaml
# Layer 7 policy - inspect HTTP methods and paths
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-backend

  ingress:
    - fromEndpoints:
        - matchLabels:
            app: api-frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v1/.*"
              - method: POST
                path: "/api/v1/data$"
              # Block DELETE and admin endpoints
```

## DNS-Based Egress Policy

```yaml
# Allow pods to reach external IPv6 services by DNS name
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-dns
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: worker

  egress:
    # Allow DNS first
    - toEndpoints:
        - matchLabels:
            k8s-app: kube-dns
            k8s:io.kubernetes.pod.namespace: kube-system
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*"

    # Allow HTTPS to specific external domains
    - toFQDNs:
        - matchPattern: "*.example.com"
        - matchName: "api.github.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Verifying Policies

```bash
# List all Cilium network policies
kubectl get ciliumnetworkpolicies -A

# Check policy status on a specific endpoint
kubectl get ciliumendpoint backend-pod -n production -o json | jq '.status.policy'

# Monitor IPv6 policy drops
hubble observe --verdict DROPPED --ipv6 --follow

# Test connectivity over IPv6 using the Service DNS name
kubectl exec -n production frontend-pod -- \
  curl -6 http://backend.production.svc.cluster.local:8080/api/v1/health

# Check policy enforcement mode
kubectl get ciliumendpoint backend-pod -n production -o json | \
  jq -r '.status.policy.realized["policy-enabled"]'
```

## Namespace-Wide Default Deny

```yaml
# Enforce default deny for all pods in namespace
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  endpointSelector: {}  # Matches all endpoints in namespace
  ingress: []           # Empty = deny all ingress
  egress: []            # Empty = deny all egress
```

## Conclusion

Cilium CiliumNetworkPolicy extends Kubernetes NetworkPolicy with L7 visibility, DNS-based rules, and precise CIDR matching for IPv6. Use `fromCIDR` with IPv6 prefixes for external access control, and L7 rules for API-level enforcement. Monitor policy violations with Hubble and configure OneUptime synthetic probes to verify that allowed connections succeed and denied connections are correctly blocked.
