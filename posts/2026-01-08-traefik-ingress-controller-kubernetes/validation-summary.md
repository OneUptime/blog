# Validation Summary: How to Configure Traefik as an Ingress Controller on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (step-by-step deployment and configuration walkthrough)

## Technologies Covered
- Traefik (v3, indicated by the `traefik.io/v1alpha1` API group and `*.traefik.io` CRDs)
- Kubernetes (IngressRoute, IngressRouteTCP, IngressRouteUDP, Middleware, TLSOption, TraefikService CRDs)
- Helm 3
- cert-manager
- TLS / OpenSSL
- Prometheus metrics

## Sources Consulted
- Traefik v2-to-v3 migration details: https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- Traefik HTTP routers rules & priority reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik v3 migration overview: https://doc.traefik.io/traefik/migrate/v2-to-v3/
- Traefik Helm chart repository: https://traefik.github.io/charts

## Issues Found
The post targets Traefik v3 (it uses the `traefik.io/v1alpha1` API group and the `*.traefik.io` CRD names that were introduced in v3, replacing the v2 `traefik.containo.us` group). However, several routing rules used the **v2 matcher syntax**, which is invalid under v3's default (`v3`) rule syntax. Fixes made:

1. **`Headers` matcher renamed to `Header`** (Header-Based Routing section). In v3 the matcher was renamed. Changed `Headers(\`X-API-Version\`, \`v2\`)` to `Header(\`X-API-Version\`, \`v2\`)`.

2. **`HeadersRegexp` matcher renamed to `HeaderRegexp`** (Header-Based Routing section). Changed `HeadersRegexp(\`Authorization\`, \`Bearer.*\`)` to `HeaderRegexp(\`Authorization\`, \`Bearer.*\`)`.

3. **`Method` with multiple values** (Complex Match Rules section). In v3 every matcher takes a single value (except Header/HeaderRegexp/Query/QueryRegexp) and must be combined with logical operators. Changed `Method(\`GET\`, \`POST\`)` to `(Method(\`GET\`) || Method(\`POST\`))`.

4. **`Query` matcher syntax** (Complex Match Rules section). In v3 `Query` takes two arguments (key, value) rather than a single `key=value` string. Changed `Query(\`version=2\`)` to `Query(\`version\`, \`2\`)`.

5. **Duplicate YAML key in the Headers middleware** (Headers Middleware section). The `security-headers` Middleware defined `customResponseHeaders` twice in the same map, which is invalid YAML and would be rejected by `kubectl apply` (the second mapping would silently override the first). Merged the two blocks into a single `customResponseHeaders` map containing both the custom header and the removed (`""`) headers.

## Review Notes
- The CRD list, Helm repository URL (`https://traefik.github.io/charts`), Helm install commands, values-file structure (entrypoints, ports, providers, ingressClass, metrics, logs), TLSOption fields, rateLimit, circuitBreaker, forwardAuth, stripPrefix, compress, redirect, sticky-session, and the `api@internal` dashboard TraefikService are all consistent with current Traefik v3 / Helm chart behavior.
- Traefik v3 still allows opting back into v2 rule syntax per-router via `ruleSyntax: v2` (or globally via `--core.defaultRuleSyntax=v2`), but those compatibility options are deprecated and slated for removal in the next major version. Using v3 syntax (as now corrected) is the forward-compatible choice.
- The `metrics.prometheus.entryPoint: metrics` setting references the `metrics` entrypoint that the Helm chart provisions automatically when Prometheus metrics are enabled; no explicit port definition is required, so this was left as-is.
- The basic-auth example hash (`$apr1$xyz123$hashedpassword`) is a placeholder, which is clearly indicated by the accompanying `htpasswd` generation comment.
