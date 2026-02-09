# How to Implement Linkerd Authorization Policies Using Server and ServerAuthorization Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, Authorization, Security, Zero Trust

Description: Learn how to implement fine-grained authorization in Linkerd using Server and ServerAuthorization resources to control which services can communicate based on identity and network policies.

---

Zero-trust security requires explicit authorization for every service-to-service connection. Linkerd provides Server and ServerAuthorization resources that let you define which services can communicate and under what conditions. This guide shows you how to implement comprehensive authorization policies in your service mesh.

## Understanding Linkerd Authorization Model

Linkerd's authorization works at Layer 4 and Layer 7. You define Server resources that represent services listening on specific ports. ServerAuthorization resources specify which clients can access those servers based on ServiceAccount identity, namespace, or network attributes.

Authorization happens at the proxy level before traffic reaches your application. This means unauthorized requests never consume application resources. The authorization decision is based on mTLS-verified identities, making it cryptographically secure.

By default, Linkerd allows all traffic. You must explicitly create policies to restrict access. This lets you adopt authorization incrementally without breaking existing communication patterns.

## Prerequisites

You need a Kubernetes cluster with Linkerd 2.12 or later installed. The policy controller must be enabled:

```bash
linkerd check
kubectl get pods -n linkerd | grep policy
```

Deploy sample applications:

```yaml
# sample-apps.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend-sa
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
      annotations:
        linkerd.io/inject: enabled
    spec:
      serviceAccountName: frontend-sa
      containers:
      - name: frontend
        image: your-registry/frontend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: default
spec:
  selector:
    app: frontend
  ports:
  - port: 8080
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
      annotations:
        linkerd.io/inject: enabled
    spec:
      serviceAccountName: backend-sa
      containers:
      - name: backend
        image: your-registry/backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
spec:
  selector:
    app: backend
  ports:
  - port: 8080
```

```bash
kubectl apply -f sample-apps.yaml
```

## Creating a Basic Server Resource

Define a Server that represents the backend service:

```yaml
# server-backend.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: backend-server
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: backend
  port: 8080
  proxyProtocol: HTTP/1
```

```bash
kubectl apply -f server-backend.yaml
```

This declares that pods labeled `app: backend` listen on port 8080 using HTTP/1 protocol. The Server resource is required for authorization policies to work.

## Implementing Identity-Based Authorization

Create a ServerAuthorization that allows only the frontend to access the backend:

```yaml
# serverauth-frontend-to-backend.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: frontend-to-backend
  namespace: default
spec:
  server:
    name: backend-server
  client:
    meshTLS:
      serviceAccounts:
      - name: frontend-sa
```

```bash
kubectl apply -f serverauth-frontend-to-backend.yaml
```

This policy allows connections from pods using the frontend-sa ServiceAccount to the backend-server. All other connections are denied.

Test the policy:

```bash
# From frontend - should succeed
kubectl exec -it deploy/frontend -- curl http://backend:8080/health

# From a different pod - should fail
kubectl run test --image=curlimages/curl --rm -it -- curl http://backend:8080/health
```

The test pod's connection is rejected because its identity doesn't match the policy.

## Allowing Multiple Service Accounts

Extend the policy to allow multiple clients:

```yaml
# serverauth-multiple-clients.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: backend-clients
  namespace: default
spec:
  server:
    name: backend-server
  client:
    meshTLS:
      serviceAccounts:
      - name: frontend-sa
      - name: api-gateway-sa
      - name: admin-sa
```

```bash
kubectl apply -f serverauth-multiple-clients.yaml
```

Now frontend, api-gateway, and admin service accounts can all access the backend.

## Authorizing Entire Namespaces

Allow all services in a namespace to access your server:

```yaml
# serverauth-namespace.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: trusted-namespace
  namespace: default
spec:
  server:
    name: backend-server
  client:
    meshTLS:
      serviceAccounts:
      - namespace: production
```

```bash
kubectl apply -f serverauth-namespace.yaml
```

This allows any ServiceAccount in the production namespace to access the backend. Use this for trusted namespaces where you don't need per-service granularity.

## Implementing Network-Based Authorization

Authorize based on network identity instead of mTLS:

```yaml
# serverauth-network.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: network-auth
  namespace: default
spec:
  server:
    name: backend-server
  client:
    networks:
    - cidr: 10.0.0.0/8
    - cidr: 192.168.1.0/24
```

```bash
kubectl apply -f serverauth-network.yaml
```

This allows connections from specific IP ranges. Use this for non-mesh clients that can't use mTLS, like external load balancers or monitoring systems.

## Creating Route-Based Authorization

Apply different authorization rules to different HTTP routes:

```yaml
# server-backend-routes.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: backend-server
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: backend
  port: 8080
  proxyProtocol: HTTP/1
---
apiVersion: policy.linkerd.io/v1alpha1
kind: HTTPRoute
metadata:
  name: backend-routes
  namespace: default
spec:
  parentRefs:
  - name: backend-server
    kind: Server
    group: policy.linkerd.io
  rules:
  - matches:
    - path:
        value: "/api/public"
        type: PathPrefix
    backendRefs:
    - name: backend
      port: 8080
  - matches:
    - path:
        value: "/api/admin"
        type: PathPrefix
    backendRefs:
    - name: backend
      port: 8080
---
apiVersion: policy.linkerd.io/v1alpha1
kind: AuthorizationPolicy
metadata:
  name: backend-route-auth
  namespace: default
spec:
  targetRef:
    kind: HTTPRoute
    name: backend-routes
  requiredAuthenticationRefs:
  - kind: MeshTLSAuthentication
    name: frontend-auth
```

This is more advanced and allows different authorization for different routes on the same service.

## Implementing Default Deny Policies

Create a default deny policy that blocks all traffic except explicitly allowed:

```yaml
# server-backend-deny-all.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: backend-server
  namespace: default
  annotations:
    # Enable default deny
    config.linkerd.io/default-inbound-policy: "deny"
spec:
  podSelector:
    matchLabels:
      app: backend
  port: 8080
  proxyProtocol: HTTP/1
```

With this annotation, all connections are denied unless a ServerAuthorization explicitly allows them. This is the most secure approach but requires careful policy management.

## Authorizing Specific HTTP Methods

Restrict access based on HTTP methods:

```yaml
# server-backend-methods.yaml
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: backend-server
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: backend
  port: 8080
  proxyProtocol: HTTP/1
---
apiVersion: policy.linkerd.io/v1alpha1
kind: HTTPRoute
metadata:
  name: backend-readonly
  namespace: default
spec:
  parentRefs:
  - name: backend-server
    kind: Server
    group: policy.linkerd.io
  rules:
  - matches:
    - method: GET
    - method: HEAD
---
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: readonly-access
  namespace: default
spec:
  server:
    name: backend-server
  client:
    meshTLS:
      serviceAccounts:
      - name: readonly-sa
```

This restricts readonly-sa to only GET and HEAD requests.

## Monitoring Authorization Denials

Check for authorization failures in metrics:

```bash
# View authorization metrics
kubectl exec -n linkerd deploy/linkerd-prometheus -- \
  promtool query instant http://localhost:9090 \
  'inbound_http_authz_deny_total{namespace="default"}'
```

Query Prometheus for denied requests:

```promql
# Authorization denial rate
rate(inbound_http_authz_deny_total[5m])

# Denials by client identity
sum by (client_id) (
  rate(inbound_http_authz_deny_total[5m])
)
```

Check proxy logs for authorization details:

```bash
kubectl logs deploy/backend -c linkerd-proxy | grep authz
```

## Troubleshooting Authorization Policies

If authorization doesn't work as expected, check these areas:

Verify the Server resource exists:

```bash
kubectl get server -n default
kubectl describe server backend-server -n default
```

Check ServerAuthorization is applied:

```bash
kubectl get serverauthorization -n default
kubectl describe serverauthorization frontend-to-backend -n default
```

Verify client identity:

```bash
linkerd identity deploy/frontend -n default
```

The identity should match what you specified in the ServerAuthorization.

## Testing Authorization Policies

Create a test matrix to verify policies:

```bash
# Test allowed client
kubectl exec deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://backend:8080
# Should return 200

# Test denied client
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -s -o /dev/null -w "%{http_code}" http://backend:8080
# Should fail or return 403
```

## Conclusion

Linkerd's Server and ServerAuthorization resources provide fine-grained access control for service-to-service communication. Define Server resources for services, then create ServerAuthorization policies that specify which clients can access them.

Use ServiceAccount-based authorization for mTLS-authenticated clients and network-based authorization for non-mesh clients. Implement default deny policies for maximum security, explicitly allowing only necessary communication paths.

Monitor authorization metrics to detect denied requests and adjust policies accordingly. Start with permissive policies and gradually tighten them as you understand your service communication patterns. This gives you production-grade zero-trust security for your service mesh.
