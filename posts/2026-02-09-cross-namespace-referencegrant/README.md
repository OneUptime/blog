# How to Configure Cross-Namespace Resource Sharing with ReferenceGrant

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway-API, Networking

Description: Learn how to use ReferenceGrant from the Gateway API to enable secure cross-namespace resource references for services, secrets, and other resources while maintaining namespace isolation.

---

ReferenceGrant is a Kubernetes Gateway API resource that enables controlled cross-namespace resource references. It allows specific resources in one namespace to reference resources in another while maintaining security boundaries, enabling shared infrastructure without compromising isolation.

This guide covers implementing cross-namespace resource sharing using ReferenceGrant.

## Understanding ReferenceGrant

ReferenceGrant solves the problem of strict namespace isolation when you need to:

- Share backend services across ingress controllers in different namespaces
- Reference TLS secrets from a centralized namespace
- Allow Gateway resources to route to services in application namespaces
- Share ConfigMaps or other resources between namespaces

Without ReferenceGrant, cross-namespace references are blocked for security.

## Installing Gateway API CRDs

Install Gateway API with ReferenceGrant support:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

Verify installation:

```bash
kubectl get crd referencegrants.gateway.networking.k8s.io
```

## Basic ReferenceGrant Configuration

Allow a Gateway to reference services in another namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-to-apps
  namespace: applications
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: ingress-system
  to:
  - group: ""
    kind: Service
```

This allows HTTPRoutes in the ingress-system namespace to reference Services in the applications namespace.

## Sharing TLS Secrets

Create a centralized certificate namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: certificates
---
apiVersion: v1
kind: Secret
metadata:
  name: wildcard-tls
  namespace: certificates
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-tls-secrets
  namespace: certificates
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: ingress-system
  to:
  - group: ""
    kind: Secret
    name: wildcard-tls
```

Use the shared secret in a Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: ingress-system
spec:
  gatewayClassName: nginx
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: wildcard-tls
        namespace: certificates  # Cross-namespace reference
```

## Multi-Tenant Gateway Architecture

Create a shared gateway for multiple tenants:

```yaml
# Gateway in shared infrastructure namespace
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: gateway-system
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: default-tls
        namespace: certificates
---
# Allow tenant-a to use the gateway
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-tenant-a
  namespace: gateway-system
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: tenant-a
  to:
  - group: gateway.networking.k8s.io
    kind: Gateway
    name: shared-gateway
---
# Tenant-a HTTPRoute
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: tenant-a-route
  namespace: tenant-a
spec:
  parentRefs:
  - kind: Gateway
    name: shared-gateway
    namespace: gateway-system  # Cross-namespace reference
  hostnames:
  - "app.tenant-a.example.com"
  rules:
  - backendRefs:
    - kind: Service
      name: app-service
      port: 80
```

## Granular ReferenceGrant Control

Grant access to specific resources only:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: specific-service-grant
  namespace: backend-services
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: ingress-layer
  to:
  - group: ""
    kind: Service
    name: api-service  # Only this specific service
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: specific-secret-grant
  namespace: secrets-vault
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: gateway-system
  to:
  - group: ""
    kind: Secret
    name: production-tls  # Only this specific secret
```

## Monitoring ReferenceGrant Usage

Create a script to audit ReferenceGrant usage:

```python
from kubernetes import client, config

def audit_referencegrants():
    config.load_kube_config()
    custom_api = client.CustomObjectsApi()

    grants = custom_api.list_cluster_custom_object(
        group="gateway.networking.k8s.io",
        version="v1beta1",
        plural="referencegrants"
    )

    for grant in grants['items']:
        namespace = grant['metadata']['namespace']
        name = grant['metadata']['name']
        from_refs = grant['spec']['from']
        to_refs = grant['spec']['to']

        print(f"\nReferenceGrant: {namespace}/{name}")
        print(f"Allows:")
        for from_ref in from_refs:
            from_ns = from_ref.get('namespace', 'any')
            from_kind = from_ref['kind']
            print(f"  From: {from_kind} in {from_ns}")

        for to_ref in to_refs:
            to_kind = to_ref['kind']
            to_name = to_ref.get('name', 'any')
            print(f"  To: {to_kind}/{to_name} in {namespace}")

audit_referencegrants()
```

## Best Practices

Follow these guidelines:

1. Use ReferenceGrant sparingly to maintain isolation
2. Grant access to specific resources when possible
3. Document why cross-namespace access is needed
4. Regular audit of ReferenceGrants
5. Use RBAC to control who can create ReferenceGrants
6. Monitor for unused grants
7. Implement approval workflows for ReferenceGrant creation
8. Test referential integrity
9. Consider alternatives before breaking namespace isolation
10. Version control ReferenceGrant configurations

## Conclusion

ReferenceGrant enables controlled cross-namespace resource sharing while maintaining Kubernetes security boundaries. By explicitly granting specific cross-namespace references, you can build shared infrastructure patterns without compromising the isolation that namespaces provide.

Key use cases include shared Gateway resources, centralized TLS certificate management, multi-tenant ingress architectures, and shared backend services. With proper ReferenceGrant configuration, you can balance resource sharing with security isolation in complex Kubernetes environments.
