# How to Configure Trust Domain Migration for Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Trust Domain, Authorization, Migration, Security, Multi-Cluster

Description: How to handle trust domain migration in Istio when changing cluster identity or merging meshes while keeping authorization policies working correctly.

---

Trust domains in Istio define the identity boundary for your service mesh. By default, every Istio installation uses `cluster.local` as its trust domain. The trust domain appears in every service identity: `spiffe://cluster.local/ns/default/sa/my-service`. When you need to change this trust domain - during cluster migrations, mesh mergers, or when adopting a naming convention - authorization policies that reference an explicit old trust domain can break.

Istio's trust domain migration feature lets you change trust domains gracefully without breaking existing authorization policies.

## What is a Trust Domain?

A trust domain is the root of identity in your Istio mesh. It's the first segment of the SPIFFE identity:

```text
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

Examples:
- `spiffe://cluster.local/ns/backend/sa/api-service` (default)
- `spiffe://prod.example.com/ns/backend/sa/api-service` (custom)
- `spiffe://us-east-1.example.com/ns/backend/sa/api-service` (cluster-specific)

Authorization policies reference these identities in the `principals` field:

```yaml
rules:
  - from:
      - source:
          principals: ["cluster.local/ns/backend/sa/api-service"]
```

In Istio authorization policies, `cluster.local` is a special value that points to the current trust domain and its aliases. Policies that use a different explicit trust domain, such as `old-td/ns/backend/sa/api-service`, stop matching after a trust domain change unless you update the policy or configure aliases.

## Why Change Trust Domains?

There are several common reasons:

1. **Multi-cluster setup** - Each cluster needs a unique trust domain to distinguish identities
2. **Environment naming** - Moving from generic `cluster.local` to something descriptive like `prod.us-east.company.com`
3. **Mesh federation** - When merging two separate meshes, they need different trust domains
4. **Security requirements** - Some compliance frameworks require meaningful identity naming

## Configuring Trust Domain Aliases

The solution is trust domain aliases. You tell Istio to treat multiple trust domains as equivalent during authorization policy evaluation.

Configure this in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: "prod.example.com"
    trustDomainAliases:
      - "cluster.local"
      - "old-cluster.example.com"
```

Or edit the ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

```yaml
data:
  mesh: |-
    trustDomain: prod.example.com
    trustDomainAliases:
      - cluster.local
      - old-cluster.example.com
```

Restart istiod after the change:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

## How Trust Domain Aliases Work

With the aliases configured above, Istio treats these three identities as equivalent during authorization policy evaluation:

- `spiffe://prod.example.com/ns/backend/sa/api-service`
- `spiffe://cluster.local/ns/backend/sa/api-service`
- `spiffe://old-cluster.example.com/ns/backend/sa/api-service`

So this authorization policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-api
  namespace: backend
spec:
  selector:
    matchLabels:
      app: database
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/backend/sa/api-service"]
```

Will match traffic from a service with identity `spiffe://prod.example.com/ns/backend/sa/api-service` because `cluster.local` is listed as a trust domain alias.

## Step-by-Step Migration

Here's the process for migrating from `cluster.local` to `prod.example.com`:

### Step 1: Add the New Trust Domain as an Alias First

Before changing anything, add the new trust domain as an alias alongside the existing one:

```yaml
meshConfig:
  trustDomain: "cluster.local"
  trustDomainAliases:
    - "prod.example.com"
```

This doesn't change any identities yet. It just tells Istio that `prod.example.com` should be treated as equivalent to `cluster.local` in authorization policies.

### Step 2: Update Authorization Policies

If your authorization policies use the explicit old trust domain, update them to use the new trust domain or the `cluster.local` pointer:

```yaml
# Before
principals: ["old-td/ns/backend/sa/api-service"]

# After
principals: ["prod.example.com/ns/backend/sa/api-service"]
```

Since both trust domains are aliased, both the old and new policy values work. For long-term policies, Istio recommends using `cluster.local/ns/.../sa/...` as the trust domain part because it follows the current trust domain and aliases.

### Step 3: Switch the Primary Trust Domain

Now change the primary trust domain:

```yaml
meshConfig:
  trustDomain: "prod.example.com"
  trustDomainAliases:
    - "cluster.local"
```

The old trust domain is now an alias. New certificates will use `prod.example.com`, but policies referencing `cluster.local` still work.

### Step 4: Roll Workloads to Get New Certificates

After changing the trust domain, existing workloads still have certificates with the old trust domain. They get new certificates at the next certificate rotation (every 24 hours by default) or when you restart them:

```bash
# Restart workloads to get new certificates immediately
kubectl rollout restart deployment -n backend
kubectl rollout restart deployment -n frontend
```

### Step 5: Remove the Old Alias (Eventually)

Once all workloads have new certificates and all policies use the new trust domain, you can remove the old alias:

```yaml
meshConfig:
  trustDomain: "prod.example.com"
  # No more aliases needed
```

Only do this when you're confident that no policies or workloads still reference the old trust domain.

## Multi-Cluster Trust Domain Migration

In a multi-cluster setup, clusters can share one trust domain or use multiple trust domains, as long as they share a root of trust. When you add a new trust domain to the mesh, configure it and add it as an alias on existing clusters:

```yaml
# Cluster 1 config
meshConfig:
  trustDomain: "us-east-1.example.com"
  trustDomainAliases:
    - "us-west-2.example.com"
    - "eu-west-1.example.com"

# Cluster 2 config
meshConfig:
  trustDomain: "us-west-2.example.com"
  trustDomainAliases:
    - "us-east-1.example.com"
    - "eu-west-1.example.com"
```

Authorization policies on cluster 1 can reference services from cluster 2 using either trust domain when the domains are configured as aliases:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-cross-cluster
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "us-west-2.example.com/ns/frontend/sa/web-app"
```

## Verifying Trust Domain Configuration

Check the current trust domain:

```bash
# Check mesh config
kubectl get configmap istio -n istio-system -o yaml | grep -A 5 trustDomain

# Check what trust domain a workload is using
istioctl proxy-config secret deploy/api-service -n backend
```

Verify that aliases are working:

```bash
# Check Envoy configuration for trust domains
istioctl proxy-config cluster deploy/api-service -n backend -o json | grep -i trust

# Test cross-trust-domain authorization
kubectl exec -n backend deploy/api-service -- curl -s -o /dev/null -w "%{http_code}" http://target-service:8080/api
```

## Authorization Policy Patterns for Migration

During migration, you can write policies that work with both trust domains:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Works with old trust domain
    - from:
        - source:
            principals: ["cluster.local/ns/frontend/sa/web-app"]
    # Works with new trust domain
    - from:
        - source:
            principals: ["prod.example.com/ns/frontend/sa/web-app"]
```

With trust domain aliases configured, you only need one of these entries. Using `cluster.local/ns/frontend/sa/web-app` is usually the simplest long-term form because Istio treats `cluster.local` in authorization policies as the current trust domain and its aliases.

## Common Mistakes

1. **Forgetting to restart istiod** after changing trust domain config. The config change doesn't take effect until istiod picks it up.

2. **Not restarting workloads** after changing the primary trust domain. Workloads keep their old certificates until rotation or restart.

3. **Removing aliases too early.** Don't remove the old trust domain alias until you're absolutely sure all policies and workloads have been updated.

4. **Certificate chain issues in multi-cluster.** When different clusters use different trust domains, they need a shared root CA or intermediate CA for cross-cluster mTLS to work.

5. **Forgetting about namespace-based policies.** Namespace-based policies (`namespaces: ["frontend"]`) are not affected by trust domain changes because they don't reference the trust domain directly. Policies that match `principals` or `trustDomains` are the ones that need attention.

Trust domain migration is a careful process, but the aliases feature makes it safe. Take it step by step, validate at each stage, and keep the old aliases until the migration is fully complete.
