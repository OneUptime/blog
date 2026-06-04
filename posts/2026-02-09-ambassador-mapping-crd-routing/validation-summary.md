# Validation Summary: How to Configure Ambassador Mapping CRD for Path-Based API Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ambassador / Emissary-ingress
- Kubernetes Custom Resource Definitions
- Mapping resources (`getambassador.io/v3alpha1`)
- HTTP routing, rewriting, header matching, query parameter matching, CORS, retries, timeouts, and load balancing

## Sources Consulted
- Emissary Mapping resource documentation: https://emissary-ingress.dev/docs/3.8/howtos/route/
- Emissary header-based routing documentation: https://emissary-ingress.dev/docs/3.10/topics/using/headers/headers/
- Emissary rewrites documentation: https://emissary-ingress.dev/docs/3.10/topics/using/rewrites/
- Emissary method-based routing documentation: https://emissary-ingress.dev/docs/3.10/topics/using/method/
- Emissary query parameter routing documentation: https://emissary-ingress.dev/docs/3.10/topics/using/query-parameters/
- Emissary prefix regex documentation: https://emissary-ingress.dev/docs/3.10/topics/using/prefix-regex/
- Emissary canary releases documentation: https://emissary-ingress.dev/docs/3.10/topics/using/canary/
- Emissary CORS documentation: https://emissary-ingress.dev/docs/3.10/topics/using/cors/
- Emissary retries documentation: https://emissary-ingress.dev/docs/3.10/topics/using/retries/
- Emissary timeouts documentation: https://emissary-ingress.dev/docs/3.10/topics/using/timeouts/
- Emissary load balancing documentation: https://emissary-ingress.dev/docs/3.10/topics/running/load-balancer/
- Emissary add/remove request and response header documentation: https://emissary-ingress.dev/docs/3.10/topics/using/headers/add-request-headers/

## Issues Found
- Host-based routing examples used `host`; updated them to the current documented `hostname` field.
- Regex rewrite example combined a plain prefix with `prefix_regex: true`, which would make the prefix itself a regex route. Removed `prefix_regex` so the mapping matches the `/old-api/` prefix and applies `regex_rewrite`.
- Header fallback example used `precedence: 1` while describing lower precedence. Changed it to `precedence: -1` because higher precedence values are evaluated earlier.
- Header manipulation example used unsupported or undocumented dynamic header format values. Replaced them with documented Emissary dynamic values `%PROTOCOL%` and `%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%`.
- Method regex example used `method_regex` as the regex string. Updated it to set `method` to the regex and `method_regex: true`.
- Retry example used numeric `per_try_timeout`; changed it to the documented duration string format `"1s"`.
- Advanced load balancing examples omitted the required advanced resolver. Added a `KubernetesEndpointResolver` resource and `resolver: endpoint` on the mappings.
- Regex path matching example attempted to match `:path` with `regex_headers` while also setting `prefix_regex: true`. Replaced it with a regex `prefix`, which is the documented way to configure regex path matching.
- Authorization presence check used `headers`, which performs exact value matching. Changed it to `regex_headers` with `".*"`.

## Review Notes
The article uses the Ambassador name while the open source project documentation now primarily uses Emissary. The `getambassador.io/v3alpha1` Mapping API remains valid in the checked Emissary 3.x documentation.
