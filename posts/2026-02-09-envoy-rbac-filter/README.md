# How to configure Envoy RBAC filter for authorization policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, RBAC, Authorization

Description: Learn how to implement role-based access control in Envoy using the RBAC filter for fine-grained authorization policies.

---

The Role-Based Access Control (RBAC) filter provides fine-grained authorization based on request properties like source IP, headers, paths, and authenticated principals. Unlike ext_authz which delegates to external services, RBAC evaluates policies directly within Envoy for lower latency. This makes it ideal for implementing simple authorization rules without external dependencies.

## Basic RBAC Configuration

```yaml
http_filters:
- name: envoy.filters.http.rbac
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.rbac.v3.RBAC
    rules:
      action: ALLOW
      policies:
        admin_access:
          permissions:
          - and_rules:
              rules:
              - header:
                  name: ":path"
                  prefix_match: "/admin"
          principals:
          - and_rules:
              rules:
              - header:
                  name: "x-user-role"
                  exact_match: "admin"
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## IP-Based Access Control

Restrict access by source IP:

```yaml
rules:
  action: ALLOW
  policies:
    internal_network:
      permissions:
      - any: true
      principals:
      - remote_ip:
          address_prefix: 10.0.0.0
          prefix_len: 8
      - remote_ip:
          address_prefix: 192.168.0.0
          prefix_len: 16
```

## Path-Based Authorization

Different permissions for different paths:

```yaml
rules:
  action: ALLOW
  policies:
    public_read:
      permissions:
      - and_rules:
          rules:
          - header:
              name: ":path"
              prefix_match: "/api/public"
          - header:
              name: ":method"
              exact_match: "GET"
      principals:
      - any: true

    authenticated_write:
      permissions:
      - and_rules:
          rules:
          - header:
              name: ":path"
              prefix_match: "/api"
          - or_rules:
              rules:
              - header:
                  name: ":method"
                  exact_match: "POST"
              - header:
                  name: ":method"
                  exact_match: "PUT"
              - header:
                  name: ":method"
                  exact_match: "DELETE"
      principals:
      - header:
          name: "authorization"
          present_match: true
```

## Principal-Based Rules

Authorize based on authenticated identity:

```yaml
rules:
  action: ALLOW
  policies:
    service_a_to_service_b:
      permissions:
      - any: true
      principals:
      - authenticated:
          principal_name:
            exact: "spiffe://cluster.local/ns/default/sa/service-a"
```

## Deny Rules

Explicitly deny certain requests:

```yaml
rules:
  action: DENY
  policies:
    block_user:
      permissions:
      - any: true
      principals:
      - header:
          name: "x-user-id"
          exact_match: "blocked-user-123"
```

Use with shadow mode to test before enforcement.

## Combining Multiple Conditions

Complex authorization logic:

```yaml
rules:
  action: ALLOW
  policies:
    complex_rule:
      permissions:
      - and_rules:
          rules:
          - header:
              name: ":path"
              prefix_match: "/api/sensitive"
          - header:
              name: ":method"
              exact_match: "POST"
          - not_rule:
              header:
                name: "x-debug"
                present_match: true
      principals:
      - and_rules:
          rules:
          - header:
              name: "x-user-role"
              exact_match: "admin"
          - remote_ip:
              address_prefix: 10.0.0.0
              prefix_len: 8
```

Only admin users from internal network can POST to sensitive endpoints (unless debug header is present).

## Shadow Mode

Test RBAC rules without enforcing:

```yaml
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.http.rbac.v3.RBAC
  shadow_rules:
    action: ALLOW
    policies:
      test_policy:
        permissions:
        - header:
            name: ":path"
            prefix_match: "/api/new"
        principals:
        - header:
            name: "x-user-role"
            exact_match: "beta"
```

Shadow rules log what would happen without actually enforcing.

## Per-Route RBAC

Apply different RBAC policies per route:

```yaml
routes:
- match:
    prefix: "/api/admin"
  route:
    cluster: admin_service
  typed_per_filter_config:
    envoy.filters.http.rbac:
      "@type": type.googleapis.com/envoy.extensions.filters.http.rbac.v3.RBACPerRoute
      rbac:
        rules:
          action: ALLOW
          policies:
            admin_only:
              permissions:
              - any: true
              principals:
              - header:
                  name: "x-user-role"
                  exact_match: "admin"

- match:
    prefix: "/api/public"
  route:
    cluster: public_service
  typed_per_filter_config:
    envoy.filters.http.rbac:
      "@type": type.googleapis.com/envoy.extensions.filters.http.rbac.v3.RBACPerRoute
      rbac:
        rules:
          action: ALLOW
          policies:
            allow_all:
              permissions:
              - any: true
              principals:
              - any: true
```

## Monitoring RBAC

Track RBAC metrics:

```promql
# Allowed requests
envoy_http_rbac_allowed

# Denied requests
envoy_http_rbac_denied

# Shadow mode logging
envoy_http_rbac_shadow_allowed
envoy_http_rbac_shadow_denied
```

## Best Practices

1. Start with shadow mode to test policies
2. Use explicit ALLOW lists rather than DENY lists
3. Combine RBAC with JWT filter for identity-based authorization
4. Monitor denied requests to identify misconfiguration
5. Document RBAC policies clearly
6. Test policies thoroughly before production deployment

## Conclusion

Envoy's RBAC filter provides fast, local authorization without external dependencies. Configure policies based on paths, methods, headers, IPs, and authenticated principals. Use shadow mode to test policies before enforcement, and combine with JWT authentication for identity-based access control. RBAC is ideal for simple authorization rules that don't require complex external logic.
