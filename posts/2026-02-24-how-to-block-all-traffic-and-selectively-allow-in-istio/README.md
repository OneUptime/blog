# How to Block All Traffic and Selectively Allow in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Zero Trust, AuthorizationPolicy, Kubernetes

Description: Implement a zero-trust security model in Istio by denying all traffic by default and creating explicit allow rules for each service communication path.

---

The zero-trust approach to network security is simple in concept: deny everything by default, then explicitly allow only the communication paths that need to exist. This is the opposite of the traditional approach where everything is allowed and you block what you do not want. In a microservices environment, the zero-trust model is much safer because it limits the blast radius of a compromise and makes your service communication patterns explicit and auditable.

Istio makes this achievable through AuthorizationPolicy. You start with a deny-all policy and then add ALLOW policies for each legitimate communication path.

## Why Default-Deny?

In a default-allow world (which is what Kubernetes gives you out of the box), any pod can talk to any service. If an attacker compromises one service, they can reach every other service in the cluster. With default-deny:

- A compromised service can only reach services it was explicitly allowed to call
- New services are isolated by default until you add allow rules
- Your communication patterns are documented as code (the policies themselves)
- Compliance teams love it

## Step 1: Enable STRICT mTLS

Before implementing default-deny, ensure mTLS is strict across your mesh. This guarantees that all traffic is encrypted and that workload identities are verified:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Applying this in `istio-system` makes it mesh-wide. Every namespace will require mTLS.

```bash
kubectl apply -f peer-authentication.yaml
```

## Step 2: Apply a Default-Deny Policy

Create an AuthorizationPolicy with no rules in each namespace you want to protect. An ALLOW policy with no rules denies everything:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  {}
```

Wait, that looks empty. That is because an AuthorizationPolicy with an empty spec and no action defaults to ALLOW with no rules. Since there are no rules that can match, everything is denied.

A more explicit way to write it:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  action: ALLOW
  rules: []
```

Apply this to every namespace:

```bash
for ns in default production staging; do
  kubectl apply -f deny-all.yaml -n $ns
done
```

After applying, all inter-service communication in those namespaces stops. Services will get 403 responses when trying to call each other.

## Step 3: Add Allow Rules

Now you selectively open up communication paths. For each service, create an ALLOW policy that specifies who can call it.

**Allow the frontend to call the API service:**

```yaml
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
            principals: ["cluster.local/ns/default/sa/frontend"]
```

**Allow the API service to call the database proxy:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-api-to-db
  namespace: default
spec:
  selector:
    matchLabels:
      app: db-proxy
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/api-service"]
```

**Allow the ingress gateway to reach the frontend:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-to-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
```

Apply all of them:

```bash
kubectl apply -f allow-policies/
```

## Step 4: Allow Health Checks and Monitoring

Do not forget about Kubernetes health checks and monitoring. Kubelet probes bypass the sidecar (Istio rewrites them), so they should work without explicit policies. But Prometheus scraping needs to be allowed:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-prometheus
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/monitoring/sa/prometheus"]
      to:
        - operation:
            paths: ["/metrics"]
            methods: ["GET"]
```

## Service Account Setup

For source principal matching to work correctly, each service should have its own Kubernetes ServiceAccount. If all services use the `default` service account, you cannot distinguish between them in policies.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-service
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: db-proxy
  namespace: default
```

Reference the service account in your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  template:
    spec:
      serviceAccountName: api-service
      containers:
        - name: api-service
          image: my-registry/api-service:1.0
```

## Mapping Your Service Communication

Before implementing default-deny in production, map out all the communication paths. You can use Kiali to visualize current traffic patterns:

```bash
# Install Kiali if not already installed
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Access the dashboard
istioctl dashboard kiali
```

Kiali shows you a graph of which services are talking to which. Use this to build your allow-list before flipping the switch.

You can also check Envoy access logs to see what calls are being made:

```bash
kubectl logs deploy/api-service -c istio-proxy --tail=100 | grep "outbound"
```

## Gradual Rollout Strategy

Going from allow-all to deny-all overnight is risky. Here is a safer approach:

**Phase 1: Audit mode.** Deploy the policies but use a shadow/dry-run approach. Istio does not have a native dry-run mode for AuthorizationPolicy, but you can use Envoy access logging to see what would be denied without actually denying it. Add all your ALLOW policies first.

**Phase 2: Enable deny-all in staging.** Apply the default-deny policy in staging and run your test suite. Fix any missing allow rules.

**Phase 3: One namespace at a time.** Roll out to production namespaces one at a time, starting with the least critical.

**Phase 4: Monitor for 403s.** After each rollout, monitor for unexpected 403 responses:

```bash
# Check for RBAC denials in Prometheus
istio_requests_total{response_code="403", reporter="destination"}
```

## Complete Example

Here is a complete set of policies for a simple three-tier application:

```yaml
# Deny all by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec: {}
---
# Allow ingress -> frontend
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
---
# Allow frontend -> api
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-api
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend"]
---
# Allow api -> database
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-api-db
  namespace: default
spec:
  selector:
    matchLabels:
      app: database
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/api-service"]
      to:
        - operation:
            ports: ["5432"]
```

## Debugging

When something breaks after applying deny-all:

```bash
# Check which policies are in the namespace
kubectl get authorizationpolicies -n default

# Analyze for issues
istioctl analyze -n default

# Check proxy RBAC logs
istioctl proxy-config log deploy/api-service -n default --level rbac:debug
kubectl logs deploy/api-service -n default -c istio-proxy | grep "rbac"

# Verify the service account identity
istioctl proxy-config secret deploy/api-service -n default
```

## Summary

Default-deny with selective allow is the gold standard for service mesh security. Start by mapping your communication patterns, then create specific ServiceAccounts for each workload, apply the deny-all policy, and add ALLOW rules for each legitimate path. Roll it out gradually, monitor for 403s, and fix missing rules as they surface. The result is a cluster where every service communication path is explicitly authorized and auditable.
