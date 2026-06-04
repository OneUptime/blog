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
              - url_path:
                  path:
                    prefix: "/admin"
          principals:
          - and_ids:
              ids:
              - header:
                  name: "x-user-role"
                  string_match:
                    exact: "admin"
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
          - url_path:
              path:
                prefix: "/api/public"
          - header:
              name: ":method"
              string_match:
                exact: "GET"
      principals:
      - any: true

    authenticated_write:
      permissions:
      - and_rules:
          rules:
          - url_path:
              path:
                prefix: "/api"
          - or_rules:
              rules:
              - header:
                  name: ":method"
                  string_match:
                    exact: "POST"
              - header:
                  name: ":method"
                  string_match:
                    exact: "PUT"
              - header:
                  name: ":method"
                  string_match:
                    exact: "DELETE"
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
          string_match:
            exact: "blocked-user-123"
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
          - url_path:
              path:
                prefix: "/api/sensitive"
          - header:
              name: ":method"
              string_match:
                exact: "POST"
          - not_rule:
              header:
                name: "x-debug"
                present_match: true
      principals:
      - and_ids:
          ids:
          - header:
              name: "x-user-role"
              string_match:
                exact: "admin"
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
        - url_path:
            path:
              prefix: "/api/new"
        principals:
        - header:
            name: "x-user-role"
            string_match:
              exact: "beta"
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
                  string_match:
                    exact: "admin"

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

```text
# Allowed requests

http.<stat_prefix>.rbac.allowed

# Denied requests
http.<stat_prefix>.rbac.denied

# Shadow mode logging
http.<stat_prefix>.rbac.shadow_allowed
http.<stat_prefix>.rbac.shadow_denied
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
