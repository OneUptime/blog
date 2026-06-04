# Validation Summary: How to Implement Ambassador Ingress Mapping with Prefix Rewrite and Host Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Ambassador Edge Stack / Emissary-ingress
- `getambassador.io/v3alpha1` Mapping resources
- Host, header, method, query-parameter, and weighted routing
- Prefix and regex rewrites
- CORS, load balancing, and circuit breakers

## Sources Consulted
- Emissary-ingress Rewrites documentation: https://emissary-ingress.dev/docs/4.0/topics/using/rewrites/
- Emissary-ingress Mapping configuration and precedence documentation: https://emissary-ingress.dev/docs/3.6/topics/using/mappings/
- Emissary-ingress Host headers documentation: https://emissary-ingress.dev/docs/3.8/topics/using/headers/host/
- Emissary-ingress Header-based routing documentation: https://emissary-ingress.dev/docs/3.10/topics/using/headers/headers/
- Emissary-ingress Query parameter routing documentation: https://emissary-ingress.website.cncfstack.com/docs/2.5/topics/using/query-parameters/
- Emissary-ingress CORS documentation: https://emissary-ingress.dev/docs/3.8/topics/using/cors/
- Emissary-ingress Circuit breakers documentation: https://emissary-ingress.dev/docs/4.0/topics/using/circuit-breakers/
- Emissary-ingress Canary releases documentation: https://emissary-ingress.dev/docs/3.10/topics/using/canary/
- Emissary-ingress `v3alpha1` Go package / CRD schema reference: https://pkg.go.dev/github.com/emissary-ingress/emissary/v3/pkg/api/getambassador.io/v3alpha1
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Issues Found
- The dynamic rewrite example configured both `rewrite` and `regex_rewrite`, but Emissary only uses one and ignores `rewrite` when `regex_rewrite` is present. Removed `rewrite` and adjusted the example output to a path-only regex rewrite.
- The regex host example used `hostname` with `host_regex`; `hostname` is a DNS glob field, while `host_regex` applies to `host`. Changed the example to use `host` with `host_regex: true`.
- Header and query parameter matches used nested `value` / `regex` objects, but `v3alpha1` uses string maps for `headers`, `regex_headers`, `query_parameters`, and `regex_query_parameters`. Rewrote those snippets to valid fields.
- Several snippets used numeric `priority` for route ordering. The documented manual ordering field is integer `precedence`, so those examples and the `kubectl --sort-by` command were updated.
- The CORS example combined wildcard origins with credentials. Changed the origin to `https://app.example.com` while keeping `credentials: true`.
- The circuit breaker example used an object, but the CRD expects `circuit_breakers` as a list. Converted it to a list item.
- The response-header debug example used unsupported dynamic values for `add_response_headers`. Replaced them with documented supported values.
- The prose described Mapping ordering as "priority order." Updated it to describe Emissary's documented specificity-based sorting and optional explicit precedence.

## Review Notes
- The post uses Ambassador Edge Stack terminology while the currently available official routing documentation is primarily under Emissary-ingress. The `getambassador.io/v3alpha1` Mapping API remains the relevant schema for the examples reviewed.
- YAML snippets were parsed successfully after the corrections.
