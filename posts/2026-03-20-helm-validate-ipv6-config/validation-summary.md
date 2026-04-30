# Validation Summary: How to Validate Helm Chart IPv6 Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services
- IPv4/IPv6 dual-stack networking
- JSON Schema
- ingress-nginx

## Sources Consulted
- Helm chart format and schema files: https://helm.sh/docs/v3/topics/charts/
- Helm lint command reference: https://helm.sh/docs/v3/helm/helm_lint/
- Helm install command reference: https://docs.helm.sh/docs/helm/helm_install/
- Helm test command reference: https://helm.sh/docs/v3/helm/helm_test
- Helm chart tests documentation: https://helm.sh/de/docs/v3/topics/chart_tests
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- RFC 3986 URI syntax: https://datatracker.ietf.org/doc/html/rfc3986

## Issues Found
- The post described the validation approach as generic "helm lint rules". I corrected this to Helm's documented `values.schema.json` schema validation used with `helm lint`.
- The example values used `ipFamilies: [IPv4]`, but the install command only enabled IPv6 and set `PreferDualStack`. Per Kubernetes dual-stack Service behavior, explicitly setting only `IPv4` does not request a dual-stack Service. I changed the default example to `ipFamilies: []` and updated the template to render `ipFamilies` only when explicitly set.
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not documented by ingress-nginx. I replaced the example with an empty annotations map.
- The Service template used `{{ include "mychart.fullname" . }}` while the verification command assumed the Service name was `myapp`. I changed the example template to use `{{ .Release.Name }}` so the install and verification commands match.
- The section used `helm test myapp` without showing any chart test hooks. Helm documents that `helm test` only runs tests defined in the installed chart. I replaced that command with `helm lint ...`, which directly matches the post's validation focus and works for charts without test hooks.
- The schema snippet used a generic `$schema` URL instead of the draft-07 form shown in Helm's chart documentation, and it did not validate `networking.ipv6.enabled`. I updated the schema to draft-07 and added validation for the IPv6 enable flag plus basic `ipFamilies` constraints.

## Review Notes
- The IPv6 URL helper is technically correct. RFC 3986 requires IPv6 literals in URIs to be enclosed in square brackets.
- `PreferDualStack` falls back to single-stack behavior on clusters that do not support dual-stack; `RequireDualStack` fails instead. The post is now consistent with that behavior.
- Local `helm` and `kubectl` binaries were not available in the review environment, so command verification was done against official Helm and Kubernetes documentation.
