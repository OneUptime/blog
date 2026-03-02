# How to Use Istio with Kubernetes Service Accounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Account, Security, mTLS

Description: How Istio uses Kubernetes Service Accounts for workload identity, mTLS certificate issuance, and authorization policy enforcement in the service mesh.

---

Kubernetes Service Accounts are the foundation of workload identity in Istio. Every pod in the mesh gets a cryptographic identity based on its Service Account, and that identity drives mutual TLS authentication and authorization policy enforcement. Understanding this relationship is key to properly securing your mesh.

This guide covers how Istio uses Service Accounts, how to set them up correctly, and how to build authorization policies around them.

## How Istio Uses Service Accounts

When Istio's sidecar starts in a pod, it requests a certificate from istiod (the Istio control plane). Istiod verifies the pod's Service Account token and issues an X.509 certificate with a SPIFFE identity in this format:

```
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

For example, a pod running with Service Account `web-frontend` in namespace `production` gets the identity:

```
spiffe://cluster.local/ns/production/sa/web-frontend
```

This identity is used for:
- mTLS authentication between services
- AuthorizationPolicy source matching
- Audit logging

## Creating Service Accounts for Your Services

Each service should have its own Service Account. Running everything under the `default` Service Account means all pods in a namespace have the same identity, which makes fine-grained access control impossible.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-frontend
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-server
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-processor
  namespace: production
```

Assign them to your Deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: web-frontend
      containers:
      - name: web-frontend
        image: web-frontend:latest
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: api-server
      containers:
      - name: api-server
        image: api-server:latest
```

## Verifying the Identity

Check what identity a pod received:

```bash
istioctl proxy-config secret deploy/web-frontend -n production
```

This shows the certificates loaded by the sidecar, including the SPIFFE identity.

You can also check from within the proxy:

```bash
kubectl exec -n production deploy/web-frontend -c istio-proxy -- \
  openssl x509 -text -noout -in /var/run/secrets/credential/cert-chain.pem | \
  grep "Subject Alternative Name" -A 1
```

The output should include:

```
URI:spiffe://cluster.local/ns/production/sa/web-frontend
```

## Building Authorization Policies with Service Accounts

Now that each service has a unique identity, build AuthorizationPolicies around them.

Allow only the web frontend to access the API server:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-server-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/web-frontend"
    to:
    - operation:
        methods: ["GET", "POST"]
```

Allow the API server to access the order processor:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: order-processor-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-processor
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/api-server"
```

## Default Deny Pattern

Start with a default deny policy and explicitly allow only the traffic you expect:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}
```

An empty spec with no rules denies all traffic. Then add specific ALLOW rules for each service pair.

## Cross-Namespace Access Control

Service Accounts work across namespaces. If a service in the `backend` namespace needs to access a service in the `database` namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: database-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres-proxy
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/api-server"
        - "cluster.local/ns/backend/sa/migration-runner"
```

This allows only the `api-server` and `migration-runner` Service Accounts from the `backend` namespace to reach the database proxy.

## Using Namespace-Wide Service Account Matching

You can match all Service Accounts in a namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-production
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: prometheus
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["production"]
```

This allows any Service Account in the `production` namespace to access Prometheus. It is less granular but useful when you want namespace-level access control.

## Combining Service Account and Request Properties

You can combine service identity with request-level properties:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-api-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/admin-dashboard"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/admin/read/*"]
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/admin-dashboard"
    to:
    - operation:
        methods: ["POST", "PUT", "DELETE"]
        paths: ["/api/admin/write/*"]
    when:
    - key: request.headers[x-admin-role]
      values: ["superadmin"]
```

This policy allows the admin dashboard to read freely but requires an extra header for write operations.

## Automating Service Account Creation

Use Helm or Kustomize to ensure every service gets its own Service Account:

```yaml
# Helm template
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Release.Namespace }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
spec:
  template:
    spec:
      serviceAccountName: {{ .Values.name }}
```

## Debugging Identity Issues

If authorization policies are not working as expected, check the identity:

```bash
# Check what principal a request is coming from
kubectl exec -n production deploy/api-server -c istio-proxy -- \
  pilot-agent request GET stats | grep "rbac"
```

Look at the access logs to see the source principal:

```bash
kubectl logs -n production deploy/api-server -c istio-proxy | \
  grep "rbac" | tail -5
```

Enable debug logging for RBAC:

```bash
istioctl proxy-config log deploy/api-server -n production \
  --level rbac:debug
```

Then check logs again:

```bash
kubectl logs -n production deploy/api-server -c istio-proxy | \
  grep "rbac" | tail -20
```

## Best Practices

1. **One Service Account per service**: Never share Service Accounts between different services
2. **Explicit naming**: Name Service Accounts after the service they belong to
3. **Default deny**: Start with deny-all and add explicit ALLOW rules
4. **Least privilege**: Only allow the methods and paths each service actually needs
5. **Avoid wildcards**: Use specific principals instead of namespace-wide matching when possible
6. **Document your access matrix**: Keep a record of which services can talk to which

## Wrapping Up

Kubernetes Service Accounts are the identity foundation for Istio's security model. By giving each service its own Service Account, you enable fine-grained authorization policies that control exactly which services can communicate with each other and what operations they can perform. Set up per-service accounts from the start, use default deny policies, and build explicit allow rules based on the actual communication patterns your services need. This approach gives you a strong security posture without adding operational complexity.
