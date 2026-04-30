# Validation Summary: How to Override IPv6 Settings in Helm Values Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services
- Kubernetes dual-stack networking (IPv4/IPv6)
- Helm templating
- JSON Schema validation
- ingress-nginx annotations

## Sources Consulted
- Helm Values Files: https://helm.sh/docs/v3/chart_template_guide/values_files/
- Helm Charts and schema files: https://helm.sh/docs/topics/charts/
- Helm test command: https://helm.sh/docs/helm/helm_test/
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- RFC 3986 URI syntax: https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The original `values.yaml` example set `ipFamilyPolicy: SingleStack` and `ipFamilies: [IPv4]`, which conflicted with the post's dual-stack testing flow and would not request dual-stack Service addressing when IPv6 was enabled. I changed the default policy to `PreferDualStack` and changed `ipFamilies` to an empty list so Kubernetes can choose families automatically unless the chart user explicitly sets their order.
- The Service template always rendered `ipFamilies` whenever IPv6 was enabled. In Kubernetes, manually setting `ipFamilies` constrains Service family selection and can cause incorrect behavior if the values do not match the target cluster. I changed the template to render `ipFamilies` only when the list is explicitly set.
- The `service.ipv6ClusterIP` example implied a Kubernetes-style IPv6 Service field, but the Service API uses `clusterIP` and `clusterIPs`, and the example value was not used anywhere in the template. I removed the unused field.
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not documented in the ingress-nginx supported annotations list. I replaced it with an empty annotations map.
- The verification command assumed the Service name would be `myapp`, but the template used `{{ include "mychart.fullname" . }}`, which often renders a different name. I added Service metadata labels and switched the verification example to `kubectl describe svc -l app.kubernetes.io/instance=myapp`, which is consistent with standard Helm chart labels.
- The JSON Schema example used a generic `$schema` URL. I updated it to the draft-07 schema URL shown in Helm's schema file documentation and added `maxItems: 2` for `ipFamilies` to match the Kubernetes Service field limit.
- The `helm test` command is valid, but it only runs tests defined by chart test hooks. I clarified that caveat in the example comment.

## Review Notes
- Kubernetes documents dual-stack Service networking as stable in v1.23, with dual-stack enabled by default starting in v1.21. The post is still broadly current because it avoids older feature-gate instructions.
- Helm was not installed in the local workspace, so command verification was done against current official Helm documentation rather than local `--help` output.
