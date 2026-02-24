# How to Configure Value Matching (Prefix, Suffix, Exact) in Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Security, Service Mesh, Kubernetes

Description: Learn how to use prefix, suffix, and exact value matching in Istio authorization policies to build fine-grained access control rules for your services.

---

Istio's authorization policies give you a lot of flexibility when it comes to matching request attributes. Instead of writing a separate rule for every single path or header value, you can use prefix, suffix, and exact matching to create concise policies that cover broad patterns. This is one of those features that seems simple on the surface but makes a huge difference when you're managing access control across dozens of services.

## Understanding the Three Match Types

Istio supports three string matching strategies in authorization policy rules:

- **Exact match** - The value must be an exact, character-for-character match
- **Prefix match** - The value must start with the specified string
- **Suffix match** - The value must end with the specified string

These matching options apply to fields like `paths`, `hosts`, `methods`, and various other string-based fields in the `AuthorizationPolicy` resource.

## Exact Matching

Exact matching is the most straightforward. If you specify a path like `/api/v1/users`, only requests hitting that exact path will match.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: exact-path-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - to:
    - operation:
        paths:
        - "/api/v1/users"
        - "/api/v1/health"
        methods:
        - "GET"
```

This policy allows GET requests only to `/api/v1/users` and `/api/v1/health`. A request to `/api/v1/users/123` would be denied because it does not exactly match either path.

## Prefix Matching

Prefix matching uses a wildcard at the end of the string. You add a `*` at the end to indicate that the value should start with the given prefix.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: prefix-path-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - to:
    - operation:
        paths:
        - "/api/v1/*"
        methods:
        - "GET"
```

Now any GET request whose path starts with `/api/v1/` will be allowed. This covers `/api/v1/users`, `/api/v1/users/123`, `/api/v1/orders`, and so on. The `*` acts as a wildcard for the remainder of the string.

This is really useful when you have versioned API endpoints and want to blanket-allow access to everything under a particular version prefix.

## Suffix Matching

Suffix matching works with a wildcard at the beginning of the string. You place a `*` at the start to indicate matching against the end of the value.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: suffix-host-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts:
        - "*.example.com"
```

This allows requests to any subdomain of `example.com`, such as `api.example.com`, `web.example.com`, or `admin.example.com`.

Suffix matching on paths is also possible. For example, you could block access to all `.json` files:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-json-files
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
  - to:
    - operation:
        paths:
        - "*.json"
```

## Combining Match Types in a Single Policy

You can mix and match these strategies within the same policy. Here is an example that uses prefix matching on paths and suffix matching on hosts:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: combined-matching-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - "frontend"
    to:
    - operation:
        paths:
        - "/api/*"
        hosts:
        - "*.myapp.svc.cluster.local"
        methods:
        - "GET"
        - "POST"
```

This says: allow GET and POST requests from the `frontend` namespace, as long as the path starts with `/api/` and the host ends with `.myapp.svc.cluster.local`.

## Matching on Header Values

You can also use value matching on request headers through the `when` field. The `request.headers` key supports exact matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: header-matching-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - when:
    - key: request.headers[x-custom-role]
      values:
      - "admin"
      - "editor"
    to:
    - operation:
        paths:
        - "/admin/*"
```

For header-based conditions in the `when` field, the `values` list supports exact matching, and `notValues` can be used for exclusion.

## Matching on Principals and Namespaces

Source identities also support matching patterns. You can use prefix and suffix matching on `principals`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: principal-matching
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/*"
```

This allows any service account from the `production` namespace by using a prefix match on the SPIFFE identity.

## Practical Tips for Value Matching

**Be careful with broad prefixes.** A path rule like `/*` matches everything. If you accidentally combine that with an ALLOW action and no other constraints, you have effectively opened the door to all traffic.

**Suffix matching on paths can be tricky.** If you block `*.php` paths, make sure you also consider query strings. Istio matches against the normalized path, not including query parameters, so this should work as expected in most cases.

**Order within a values list is OR logic.** When you list multiple values in a field like `paths`, the policy matches if any one of those values matches. All fields within a single rule entry are ANDed together.

**Test with dry-run first.** Before enforcing a policy, use the `CUSTOM` action with an external authorizer in dry-run mode, or use Istio telemetry to verify what would be matched. You can also check the Envoy access logs to see which policies are being evaluated.

## Debugging Match Issues

When a policy is not matching as expected, the first thing to do is check the Envoy proxy logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n default | grep rbac
```

Look for `rbac_access_denied` or `rbac_access_allowed` entries. These will tell you which policy was evaluated and what the outcome was.

You can also use `istioctl x authz check` to inspect the authorization configuration loaded into a specific proxy:

```bash
istioctl x authz check <pod-name> -n default
```

This shows you all the policies that apply to the workload and how they are translated into Envoy filter configurations.

## Summary

Prefix, suffix, and exact matching in Istio authorization policies give you the building blocks for flexible and maintainable access control. Exact matching is great for specific endpoints, prefix matching handles versioned APIs and path hierarchies, and suffix matching works well for domain-based rules and file type restrictions. By combining these three techniques, you can build policies that are both expressive and easy to understand without writing a separate rule for every endpoint in your system.
