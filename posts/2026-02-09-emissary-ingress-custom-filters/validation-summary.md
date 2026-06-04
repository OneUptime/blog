# Validation Summary: How to Configure Emissary-ingress with Custom Filters for Request Transformation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Emissary-ingress
- Ambassador Edge Stack
- Envoy Proxy
- Helm
- Flask
- YAML

## Sources Consulted
- Emissary-ingress 4.1 Quick Start: https://emissary-ingress.dev/docs/4.1/quick-start/
- Emissary-ingress 3.9 AuthService documentation: https://emissary-ingress.dev/docs/3.9/topics/running/services/auth-service/
- Emissary-ingress 3.9 add request headers documentation: https://emissary-ingress.dev/docs/3.9/topics/using/headers/add-request-headers/
- Emissary-ingress 3.9 remove request headers documentation: https://emissary-ingress.dev/docs/3.9/topics/using/headers/remove-request-headers/
- Emissary-ingress 3.10 header-based routing documentation: https://emissary-ingress.dev/docs/3.10/topics/using/headers/headers/
- Ambassador Edge Stack FilterPolicy API reference: https://www.getambassador.io/docs/edge-stack/latest/custom-resources/getambassador/v3alpha1/filterpolicy
- Ambassador Edge Stack filters documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/using/filters
- Emissary-ingress 3.9.1 CRD manifest: https://app.getambassador.io/yaml/emissary/3.9.1/emissary-crds.yaml
- Ambassador Edge Stack 3.12.10 CRD manifest: https://app.getambassador.io/yaml/edge-stack/3.12.10/aes-crds.yaml

## Issues Found
- The post described `Filter` and `FilterPolicy` resources as Emissary-ingress resources. The Emissary-ingress 3.9.1 CRD manifest does not include `filters.getambassador.io` or `filterpolicies.getambassador.io`; those CRDs are part of Ambassador Edge Stack. I rewrote the article to use Emissary `Mapping` and `AuthService` resources and added a caveat that Edge Stack is required for `Filter`/`FilterPolicy`.
- The install instructions used older Datawire chart repository commands and a 3.9.1 CRD URL. Current Emissary documentation recommends OCI Helm charts and version 4.1.0, so I updated the installation commands.
- The request header example referenced a nonexistent Plugin filter named `add-headers`. Emissary supports request header addition directly on `Mapping`, so I removed the invalid `Filter` and `FilterPolicy` resources.
- The conditional header example used `headers` with a regex value. Emissary uses `regex_headers` for regular expression header matching, so I corrected that field.
- The examples claimed response body transformation and Lua request transformation through Plugin filters. The documented Emissary Mapping features cover headers, routing, and rewrites, while Edge Stack Plugin filters are Go plugins rather than inline Lua filters. I removed the Lua filter examples and replaced them with supported Mapping path rewriting and query parameter matching.
- The external authentication example used `kind: Filter` with `spec.External`, which is Edge Stack syntax. For Emissary-ingress, external auth is configured with `kind: AuthService`, so I converted the example.
- The diagnostics command forwarded `service/emissary-ingress`, but current Emissary installs a Service named `emissary`. I updated the command.

## Review Notes
The corrected post now focuses on open source Emissary-ingress capabilities. Advanced filter chaining, JWT/OAuth2/API key filters, and custom plugin filters are valid Ambassador Edge Stack topics, but they should be covered in a separate Edge Stack-specific post.
