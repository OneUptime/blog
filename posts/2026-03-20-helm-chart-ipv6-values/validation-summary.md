# Validation Summary: How to Configure Helm Chart Values for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services
- IPv4/IPv6 dual-stack networking
- JSON Schema
- ingress-nginx annotations

## Sources Consulted
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes API reference for `ServiceSpec`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Helm chart values best practices: https://docs.helm.sh/docs/chart_best_practices/values/
- Helm chart structure and `values.schema.json`: https://helm.sh/docs/topics/charts
- Helm template function list: https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm install command reference: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The example `nginx.ingress.kubernetes.io/ipv6-enabled` annotation is not documented by ingress-nginx. I removed it and changed the example to a generic `annotations: {}` placeholder with a controller-specific comment.
- The example `service.ipv6ClusterIP` value was misleading because Kubernetes Service IP assignment is handled with `clusterIP` and `clusterIPs`, not a separate IPv6-only field. I removed the unused value from the example.
- The Service template used `targetPort: http`, which depends on a separately named container port that the post did not define. I changed it to `targetPort: {{ .Values.service.port }}` so the snippet is self-consistent.
- The install example enabled IPv6 but did not explicitly set dual-stack `ipFamilies`, and the verification command queried `myapp` even though the shown template names the Service with `{{ include "mychart.fullname" . }}`. I updated the example to set both IP families and to verify the rendered Service name.
- The JSON Schema example used a generic `$schema` URL and did not constrain `ipFamilies` length. I updated it to Draft 07 and limited `ipFamilies` to 1-2 entries to match Kubernetes Service behavior.

## Review Notes
- The `helm` and `kubectl` CLIs were not installed in this workspace on 2026-04-30, so command syntax and API behavior were validated against official documentation rather than local `--help` output or live command execution.
- The IPv6 formatting helper is valid for unbracketed IP literals. Callers should pass raw host values and let the helper add brackets when needed.
