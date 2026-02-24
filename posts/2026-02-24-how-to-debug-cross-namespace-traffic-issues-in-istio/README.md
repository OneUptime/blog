# How to Debug Cross-Namespace Traffic Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Namespaces, Debugging, Service Mesh, Network Policy

Description: Debug and resolve issues with cross-namespace service communication in Istio, covering Sidecar resources, AuthorizationPolicies, and namespace isolation patterns.

---

Kubernetes services can talk to services in other namespaces using fully qualified domain names like `my-service.other-namespace.svc.cluster.local`. This works fine in plain Kubernetes, but Istio adds several layers that can block or misdirect cross-namespace traffic. Sidecar resources, AuthorizationPolicies, namespace-scoped PeerAuthentication, and even VirtualServices can all interfere.

Here is how to figure out what is going wrong when cross-namespace calls fail.

## The Basics: FQDN and Service Discovery

First, make sure the service is being called with the right name. From namespace A, to reach a service in namespace B:

```bash
# Short name only works within the same namespace
curl http://my-service:8080  # Only works if caller is in the same namespace

# FQDN works across namespaces
curl http://my-service.namespace-b.svc.cluster.local:8080
```

Verify the service exists in the target namespace:

```bash
kubectl get svc my-service -n namespace-b
kubectl get endpoints my-service -n namespace-b
```

Test from the source pod:

```bash
kubectl exec -it my-app-xxxxx -n namespace-a -c my-app -- curl -v http://my-service.namespace-b.svc.cluster.local:8080
```

## Check Sidecar Resources

Sidecar resources control the visibility of services from a proxy's perspective. If a Sidecar resource in namespace A limits egress to only services in namespace A, the proxy will not have routes for services in namespace B.

```bash
kubectl get sidecar -n namespace-a -o yaml
```

A restrictive Sidecar:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: namespace-a
spec:
  egress:
    - hosts:
        - "./*"  # Only services in namespace-a
```

This blocks visibility of all other namespaces. Fix it by adding the target namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: namespace-a
spec:
  egress:
    - hosts:
        - "./*"
        - "namespace-b/*"
        - "istio-system/*"
```

Or use a wildcard to allow all namespaces (less restrictive but simpler):

```yaml
  egress:
    - hosts:
        - "*/*"
```

Verify the proxy has the target service in its config after updating the Sidecar:

```bash
istioctl proxy-config clusters my-app-xxxxx.namespace-a | grep "namespace-b"
```

If the target service is not in the cluster list, the Sidecar resource is still filtering it out.

## Check AuthorizationPolicies

AuthorizationPolicies in the destination namespace might be blocking traffic from the source namespace:

```bash
kubectl get authorizationpolicy -n namespace-b
```

A policy that only allows traffic from within the same namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: namespace-only
  namespace: namespace-b
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["namespace-b"]
```

This blocks everything from other namespaces. To allow traffic from namespace A:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-namespace-a
  namespace: namespace-b
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["namespace-a", "namespace-b"]
```

Check the Envoy logs on the destination for RBAC denials:

```bash
kubectl logs my-service-xxxxx -n namespace-b -c istio-proxy | grep "rbac_access_denied"
```

## Check PeerAuthentication

If namespace B has STRICT mTLS but the source pod in namespace A does not have a sidecar, the connection will fail:

```bash
kubectl get peerauthentication -n namespace-b
```

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: namespace-b
spec:
  mtls:
    mode: STRICT
```

Options:
1. Ensure the source pod has a sidecar injected
2. Switch to PERMISSIVE mode (allows both mTLS and plaintext)
3. Add a workload-specific exception

Check if both pods are in the mesh:

```bash
istioctl x describe pod my-app-xxxxx -n namespace-a
istioctl x describe pod my-service-xxxxx -n namespace-b
```

## Check VirtualServices

A VirtualService in the destination namespace might be routing traffic unexpectedly:

```bash
kubectl get virtualservice -n namespace-b
```

Look for VirtualServices that match the target host. They might be sending traffic to a different destination or applying unexpected transformations.

Check the route configuration on the source proxy:

```bash
istioctl proxy-config routes my-app-xxxxx.namespace-a --name "8080" -o json | grep -A 20 "namespace-b"
```

## Check DestinationRules Across Namespaces

DestinationRules can be defined in the source namespace, the destination namespace, or the root namespace (istio-system). The precedence rules are:

1. DestinationRule in the destination service's namespace
2. DestinationRule in the root namespace (if `exportTo` includes the source namespace)
3. DestinationRule in the source namespace

A DestinationRule in namespace B with restrictive traffic policies might cause issues:

```bash
kubectl get destinationrule -n namespace-b
```

A common problem is a DestinationRule requiring a specific subset that does not match all pods:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: namespace-b
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

## Check exportTo Settings

Both VirtualServices and ServiceEntries have an `exportTo` field that controls which namespaces can see them:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: namespace-b
spec:
  exportTo:
    - "."  # Only visible in namespace-b
  hosts:
    - my-service
```

If `exportTo` is set to `.` (current namespace only), other namespaces will not see this VirtualService. To make it visible everywhere:

```yaml
  exportTo:
    - "*"
```

Or to specific namespaces:

```yaml
  exportTo:
    - "."
    - "namespace-a"
```

## Check Kubernetes Network Policies

Do not forget that Kubernetes NetworkPolicies work independently of Istio and can block cross-namespace traffic:

```bash
kubectl get networkpolicy -n namespace-b
```

A NetworkPolicy that blocks ingress from other namespaces:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-other-namespaces
  namespace: namespace-b
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}  # Only from same namespace
```

To allow traffic from namespace A:

```yaml
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: namespace-a
```

## Debugging Checklist

Work through these in order:

1. Verify the target service and endpoints exist
2. Test connectivity with the FQDN
3. Check Sidecar resources for namespace restrictions
4. Check AuthorizationPolicies for RBAC blocks
5. Check PeerAuthentication for mTLS mismatches
6. Check VirtualService and DestinationRule for routing issues
7. Check exportTo settings on Istio resources
8. Check Kubernetes NetworkPolicies

```bash
# Quick diagnostic commands
istioctl proxy-config clusters my-app-xxxxx.namespace-a | grep namespace-b
istioctl proxy-config endpoints my-app-xxxxx.namespace-a | grep namespace-b
kubectl logs my-service-xxxxx -n namespace-b -c istio-proxy | tail -20
istioctl analyze -n namespace-a -n namespace-b
```

Cross-namespace traffic issues in Istio almost always come down to one of three things: Sidecar resources limiting visibility, AuthorizationPolicies blocking access, or PeerAuthentication mTLS mismatches. Check those three first and you will solve the majority of cases.
