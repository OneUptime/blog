# How to Compare Istio Authorization vs Kubernetes RBAC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, RBAC, Authorization, Security

Description: A clear comparison of Istio AuthorizationPolicy and Kubernetes RBAC explaining what each controls, how they work together, and when to use which for securing your cluster.

---

Istio AuthorizationPolicy and Kubernetes RBAC both have "authorization" in their name, but they protect completely different things. Confusing the two is common and can leave security gaps. Kubernetes RBAC controls who can interact with the Kubernetes API (create pods, read secrets, modify deployments). Istio AuthorizationPolicy controls which services can talk to other services at the network level.

Understanding where each one applies and how they complement each other is important for building a properly secured cluster.

## What Kubernetes RBAC Controls

Kubernetes RBAC (Role-Based Access Control) governs access to the Kubernetes API server. It answers the question: "Can this user or service account perform this operation on this Kubernetes resource?"

For example, Kubernetes RBAC controls whether:
- A developer can create Deployments in a specific namespace
- A CI/CD pipeline service account can update ConfigMaps
- A monitoring tool can read Pods and Services
- An operator can delete PersistentVolumeClaims

RBAC is implemented through four resource types:

```yaml
# Role: defines permissions within a namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
# RoleBinding: assigns the role to a user or service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: ServiceAccount
    name: monitoring-agent
    namespace: monitoring
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

There are also ClusterRole and ClusterRoleBinding for cluster-wide permissions.

RBAC operates at the Kubernetes API level. It has nothing to do with the actual network traffic between your application pods.

## What Istio AuthorizationPolicy Controls

Istio AuthorizationPolicy governs network-level access between services. It answers the question: "Can this service send this type of request to that service?"

For example, Istio AuthorizationPolicy controls whether:
- The frontend service can call the API service on port 8080
- The payment service can make POST requests to the billing service
- Only requests with a valid JWT from a specific issuer can access an endpoint
- Traffic from a specific namespace can reach services in another namespace

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/frontend
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

This policy says: only the frontend service account (identified by its SPIFFE identity) can make GET or POST requests to paths starting with `/api/` on the api-service.

AuthorizationPolicy operates at the Envoy sidecar level. When a request arrives, the sidecar checks it against the applicable policies before forwarding it to the application.

## The Key Difference Illustrated

Here is a scenario that shows the difference clearly:

A developer uses kubectl to deploy a malicious pod that calls your payment service directly. Let us see what each system protects against:

**Kubernetes RBAC**: If RBAC is configured properly, the developer might not be allowed to create pods in the production namespace at all. If they can create pods but the pod's service account does not have permissions to access secrets, those secrets are protected. But RBAC says nothing about whether the malicious pod can send network requests to the payment service.

**Istio AuthorizationPolicy**: Even if the malicious pod is running in the cluster, the AuthorizationPolicy on the payment service can deny requests from any service account other than the authorized ones. The Envoy sidecar on the payment service rejects the request before it reaches the application.

You need both. RBAC prevents unauthorized API operations. AuthorizationPolicy prevents unauthorized network communication.

## Comparison Table

| Feature | Kubernetes RBAC | Istio AuthorizationPolicy |
|---|---|---|
| What it protects | Kubernetes API access | Service-to-service traffic |
| Identity | Users, Groups, ServiceAccounts | SPIFFE identity, namespaces, IPs |
| Granularity | API resources + verbs | HTTP methods, paths, headers, ports |
| Enforcement point | API server | Envoy sidecar proxy |
| Scope | Namespace or cluster | Namespace or mesh-wide |
| Default behavior | Allow all (no policies = open) | Allow all (no policies = open) |
| Deny capability | No (only allow) | Yes (DENY, ALLOW, CUSTOM actions) |

## RBAC Cannot Replace AuthorizationPolicy

Some teams think that if they lock down RBAC tightly, they do not need Istio authorization. This is wrong for several reasons:

1. **RBAC does not control pod-to-pod traffic**: A pod with any service account can send HTTP requests to any other pod by default. RBAC does not prevent this.

2. **Compromised pods bypass RBAC**: If an attacker compromises a running pod, they can send arbitrary network requests within the cluster. The pod's Kubernetes service account permissions are irrelevant; what matters is what network policies (or Istio policies) allow.

3. **RBAC has no L7 awareness**: RBAC does not know about HTTP methods, paths, or headers. You cannot say "this service can only make GET requests to /api/read" with RBAC.

## AuthorizationPolicy Cannot Replace RBAC

Similarly, Istio AuthorizationPolicy does not protect the Kubernetes API:

1. **kubectl operations are not mesh traffic**: When someone runs `kubectl delete deployment`, that request goes directly to the API server, not through the mesh. AuthorizationPolicy cannot control this.

2. **Secret access is RBAC's domain**: Who can read Kubernetes Secrets, create ServiceAccounts, or modify RBAC rules is entirely controlled by Kubernetes RBAC.

3. **Cluster operations need RBAC**: Node management, namespace creation, CRD installation, and other cluster operations are protected by RBAC, not Istio.

## Using Both Together

The best security posture uses both systems:

```yaml
# Kubernetes RBAC: Restrict what the frontend service account can do in the API
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: frontend-role
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]
    resourceNames: ["frontend-config"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: frontend-binding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: frontend
    namespace: default
roleRef:
  kind: Role
  name: frontend-role
  apiGroup: rbac.authorization.k8s.io
---
# Istio AuthorizationPolicy: Restrict what the frontend service can call
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/frontend
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/products", "/api/categories"]
```

The RBAC role limits the frontend service account to only reading a specific ConfigMap. The AuthorizationPolicy limits the frontend service to only making GET requests to specific API paths on the api-service.

## Default-Deny Patterns

For both systems, a default-deny approach is the most secure:

**Kubernetes RBAC default-deny**: Do not grant any permissions by default. Only create Roles and RoleBindings for the specific permissions each service account needs.

**Istio AuthorizationPolicy default-deny**: Create a policy that denies all traffic, then add ALLOW policies for each authorized communication path:

```yaml
# Deny all traffic in the namespace by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec: {}
---
# Then explicitly allow specific paths
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/frontend
```

## Auditing and Troubleshooting

For RBAC issues, check if a specific action is allowed:

```bash
kubectl auth can-i create deployments --as system:serviceaccount:default:frontend -n default
```

For AuthorizationPolicy issues, check the Envoy logs for RBAC denials:

```bash
kubectl logs deploy/api-service -c istio-proxy | grep "rbac_access_denied"
```

You can also use istioctl to analyze policies:

```bash
istioctl x authz check deploy/api-service
```

## Summary

Kubernetes RBAC and Istio AuthorizationPolicy protect different layers of your system. RBAC controls access to the Kubernetes API (creating, reading, modifying cluster resources). AuthorizationPolicy controls network-level access between services (which service can call which endpoint). You need both for a complete security posture. RBAC without AuthorizationPolicy leaves your service-to-service traffic unprotected. AuthorizationPolicy without RBAC leaves your cluster management operations unprotected. Use them together for defense in depth.
